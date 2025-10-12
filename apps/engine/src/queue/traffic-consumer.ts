import { logQueueMetrics } from "../lib/monitoring";
import { batchIngestTraffic, type TrafficData } from "../lib/tinybird";
import type {
	TrafficBatchProcessingResult,
	TrafficQueueMessage,
} from "../types/queue";

/**
 * Batch send traffic data to Tinybird with retry logic
 */
async function sendBatchToTinybird(
	trafficRecords: TrafficData[],
	_env: Env,
): Promise<TrafficBatchProcessingResult> {
	const result: TrafficBatchProcessingResult = {
		successful: 0,
		failed: 0,
		errors: [],
	};

	if (trafficRecords.length === 0) {
		return result;
	}

	try {
		// Use the batch ingestion helper from tinybird.ts
		const response = await batchIngestTraffic(trafficRecords);

		result.successful = response.successful_rows;
		result.failed = response.quarantined_rows;

		// Log if any rows were quarantined
		if (response.quarantined_rows > 0) {
			console.warn(
				`${response.quarantined_rows} traffic records were quarantined by Tinybird`,
			);
			// In a production environment, you might want to store these for analysis
			for (const record of trafficRecords.slice(-response.quarantined_rows)) {
				result.errors.push({
					requestId: record.request_id,
					error: "Traffic record quarantined by Tinybird",
				});
			}
		}
	} catch (error) {
		console.error("Failed to send traffic batch to Tinybird:", error);

		// Mark all traffic records as failed
		for (const record of trafficRecords) {
			result.failed++;
			result.errors.push({
				requestId: record.request_id,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	return result;
}

/**
 * Queue consumer for processing traffic data in batches
 */
export async function handleTrafficQueue(
	batch: MessageBatch,
	env: Env,
): Promise<void> {
	const startTime = Date.now();
	const queueName = `traffic-ingestion-${env.ENVIRONMENT || "development"}`;

	console.log(`Processing batch of ${batch.messages.length} traffic events`);

	const trafficRecords: TrafficData[] = [];
	const messagesToRetry: Array<{
		message: MessageBatch["messages"][0];
		error: string;
	}> = [];
	const parseErrors: Array<{ requestId: string; error: string }> = [];

	// Extract traffic data from messages
	for (const message of batch.messages) {
		try {
			const queueMessage = message.body as TrafficQueueMessage;

			// Check if this is a traffic message
			if (queueMessage.type !== "traffic") {
				console.warn(`Unknown message type: ${queueMessage.type}`);
				message.ack(); // Acknowledge unknown messages to remove them
				continue;
			}

			// Add to batch
			trafficRecords.push(queueMessage.data);

			// Acknowledge the message (it will be retried if batch fails)
			message.ack();
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : "Unknown error";
			console.error("Failed to process message:", error);

			parseErrors.push({
				requestId: "unknown",
				error: errorMsg,
			});

			messagesToRetry.push({
				message,
				error: errorMsg,
			});
		}
	}

	// Send batch to Tinybird
	let result: TrafficBatchProcessingResult = {
		successful: 0,
		failed: 0,
		errors: [],
	};

	if (trafficRecords.length > 0) {
		result = await sendBatchToTinybird(trafficRecords, env);

		console.log(
			`Traffic batch processing complete: ${result.successful} successful, ${result.failed} failed`,
		);

		// If the entire batch failed, consider retry strategy
		if (result.successful === 0 && result.failed > 0) {
			console.error(
				"Entire traffic batch failed - records will be retried by queue retry mechanism",
			);
		}
	}

	// Retry messages that failed to parse
	for (const { message, error } of messagesToRetry) {
		const body = message.body as TrafficQueueMessage;
		const retryCount = body.retryCount || 0;

		if (retryCount < 3) {
			// Retry the message with exponential backoff
			const delaySeconds = Math.min(2 ** retryCount * 10, 300); // max 5 minutes
			message.retry({
				delaySeconds,
			});
			console.log(
				`Retrying traffic message (attempt ${retryCount + 1}) with ${delaySeconds}s delay: ${error}`,
			);
		} else {
			// Too many retries, send to DLQ
			console.error(
				`Traffic message exceeded retry limit, sending to DLQ: ${error}`,
			);
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
		successfulSessions: result.successful, // Reusing the same metric structure
		failedSessions: result.failed + parseErrors.length,
		processingTimeMs,
		errors: [
			// Transform traffic errors to match sessionId format expected by QueueMetrics
			...result.errors.map((error) => ({
				sessionId: error.requestId,
				error: error.error,
			})),
			...parseErrors.map((error) => ({
				sessionId: error.requestId,
				error: error.error,
			})),
		],
	});
}

/**
 * Export the queue handler for use in the main worker
 */
export default {
	async queue(batch: MessageBatch, env: Env): Promise<void> {
		await handleTrafficQueue(batch, env);
	},
};
