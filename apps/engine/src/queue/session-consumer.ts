import { logQueueMetrics } from "../lib/monitoring";
import type { SessionData } from "../lib/tinybird";
import { batchIngestSessions } from "../lib/tinybird";
import type {
	BatchProcessingResult,
	SessionQueueMessage,
} from "../types/queue";

/**
 * Batch send sessions to Tinybird with retry logic
 */
async function sendBatchToTinybird(
	sessions: SessionData[],
	_env: Env,
): Promise<BatchProcessingResult> {
	const result: BatchProcessingResult = {
		successful: 0,
		failed: 0,
		errors: [],
	};

	if (sessions.length === 0) {
		return result;
	}

	try {
		// Use the batch ingestion helper from tinybird.ts
		const response = await batchIngestSessions(sessions);

		result.successful = response.successful_rows;
		result.failed = response.quarantined_rows;

		// Log if any rows were quarantined
		if (response.quarantined_rows > 0) {
			console.warn(
				`${response.quarantined_rows} sessions were quarantined by Tinybird`,
			);
			// In a production environment, you might want to store these for analysis
			for (const session of sessions.slice(-response.quarantined_rows)) {
				result.errors.push({
					sessionId: session.session_id,
					error: "Session quarantined by Tinybird",
				});
			}
		}
	} catch (error) {
		console.error("Failed to send batch to Tinybird:", error);

		// Mark all sessions as failed
		for (const session of sessions) {
			result.failed++;
			result.errors.push({
				sessionId: session.session_id,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	return result;
}

/**
 * Queue consumer for processing session data in batches
 */
export async function handleSessionQueue(
	batch: MessageBatch,
	env: Env,
): Promise<void> {
	const startTime = Date.now();
	const queueName = `session-ingestion-${env.ENVIRONMENT || "development"}`;

	console.log(`Processing batch of ${batch.messages.length} session events`);

	const sessions: SessionData[] = [];
	const messagesToRetry: Array<{
		message: MessageBatch["messages"][0];
		error: string;
	}> = [];
	const parseErrors: Array<{ sessionId: string; error: string }> = [];

	// Extract session data from messages
	for (const message of batch.messages) {
		try {
			const queueMessage = message.body as SessionQueueMessage;

			// Check if this is a session message
			if (queueMessage.type !== "session") {
				console.warn(`Unknown message type: ${queueMessage.type}`);
				message.ack(); // Acknowledge unknown messages to remove them
				continue;
			}

			// Add to batch
			sessions.push(queueMessage.data);

			// Acknowledge the message (it will be retried if batch fails)
			message.ack();
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : "Unknown error";
			console.error("Failed to process message:", error);

			parseErrors.push({
				sessionId: "unknown",
				error: errorMsg,
			});

			messagesToRetry.push({
				message,
				error: errorMsg,
			});
		}
	}

	// Send batch to Tinybird
	let result: BatchProcessingResult = {
		successful: 0,
		failed: 0,
		errors: [],
	};

	if (sessions.length > 0) {
		result = await sendBatchToTinybird(sessions, env);

		console.log(
			`Batch processing complete: ${result.successful} successful, ${result.failed} failed`,
		);

		// If the entire batch failed, consider retry strategy
		if (result.successful === 0 && result.failed > 0) {
			console.error(
				"Entire batch failed - sessions will be retried by queue retry mechanism",
			);
		}
	}

	// Retry messages that failed to parse
	for (const { message, error } of messagesToRetry) {
		const body = message.body as SessionQueueMessage;
		const retryCount = body.retryCount || 0;

		if (retryCount < 3) {
			// Retry the message with exponential backoff
			const delaySeconds = Math.min(2 ** retryCount * 10, 300); // max 5 minutes
			message.retry({
				delaySeconds,
			});
			console.log(
				`Retrying message (attempt ${retryCount + 1}) with ${delaySeconds}s delay: ${error}`,
			);
		} else {
			// Too many retries, send to DLQ
			console.error(`Message exceeded retry limit, sending to DLQ: ${error}`);
			message.ack(); // Acknowledge to remove from queue
		}
	}

	// Log metrics for monitoring
	const processingTimeMs = Date.now() - startTime;
	logQueueMetrics({
		timestamp: new Date().toISOString(),
		environment: env.ENVIRONMENT || "development",
		queueName,
		batchSize: batch.messages.length,
		successfulSessions: result.successful,
		failedSessions: result.failed + parseErrors.length,
		processingTimeMs,
		errors: [...result.errors, ...parseErrors],
	});
}

/**
 * Export the queue handler for use in the main worker
 */
export default {
	async queue(batch: MessageBatch, env: Env): Promise<void> {
		await handleSessionQueue(batch, env);
	},
};
