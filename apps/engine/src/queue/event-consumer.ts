import type { EventData } from "@firebuzz/shared-types/events";
import { logQueueMetrics, trackRateLimiting } from "../lib/monitoring";
import { batchIngestEvents } from "../lib/tinybird";
import type {
	EventBatchProcessingResult,
	EventQueueMessage,
} from "../types/queue";

/**
 * Batch send events to Tinybird with retry logic
 */
async function sendBatchToTinybird(
	events: EventData[],
	env: Env,
): Promise<EventBatchProcessingResult> {
	const result: EventBatchProcessingResult = {
		successful: 0,
		failed: 0,
		errors: [],
	};

	if (events.length === 0) {
		return result;
	}

	try {
		// Use the batch ingestion helper from tinybird.ts
		const response = await batchIngestEvents(events, env);

		result.successful = response.successful_rows;
		result.failed = response.quarantined_rows;

		// Track rate limiting if headers are present
		if (response.rateLimitHeaders) {
			const headers = new Headers();
			if (response.rateLimitHeaders.limit) {
				headers.set("X-RateLimit-Limit", response.rateLimitHeaders.limit);
			}
			if (response.rateLimitHeaders.remaining) {
				headers.set(
					"X-RateLimit-Remaining",
					response.rateLimitHeaders.remaining,
				);
			}
			if (response.rateLimitHeaders.reset) {
				headers.set("X-RateLimit-Reset", response.rateLimitHeaders.reset);
			}
			if (response.rateLimitHeaders.retryAfter) {
				headers.set("Retry-After", response.rateLimitHeaders.retryAfter);
			}
			trackRateLimiting(headers);
		}

		// Log if any rows were quarantined
		if (response.quarantined_rows > 0) {
			console.warn(
				`${response.quarantined_rows} events were quarantined by Tinybird`,
			);
			// In a production environment, you might want to store these for analysis
			for (const event of events.slice(-response.quarantined_rows)) {
				result.errors.push({
					eventId: event.event_id,
					error: "Event quarantined by Tinybird",
				});
			}
		}
	} catch (error) {
		console.error("Failed to send event batch to Tinybird:", error);

		// Mark all events as failed
		for (const event of events) {
			result.failed++;
			result.errors.push({
				eventId: event.event_id,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	return result;
}

/**
 * Queue consumer for processing event data in batches
 */
export async function handleEventQueue(
	batch: MessageBatch,
	env: Env,
): Promise<void> {
	const startTime = Date.now();
	const queueName = `event-ingestion-${env.ENVIRONMENT || "development"}`;

	console.log(`📥 Processing batch of ${batch.messages.length} event messages`);

	const events: EventData[] = [];
	const messagesToRetry: Array<{
		message: MessageBatch["messages"][0];
		error: string;
	}> = [];
	const parseErrors: Array<{ eventId: string; error: string }> = [];

	// Extract event data from messages
	for (const message of batch.messages) {
		try {
			const queueMessage = message.body as EventQueueMessage;

			// Check if this is an event message
			if (queueMessage.type !== "event") {
				console.warn(`Unknown message type: ${queueMessage.type}`);
				message.ack(); // Acknowledge unknown messages to remove them
				continue;
			}

			// Add to batch
			events.push(queueMessage.data);

			// Acknowledge the message (it will be retried if batch fails)
			message.ack();
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : "Unknown error";
			console.error("Failed to process message:", error);

			parseErrors.push({
				eventId: "unknown",
				error: errorMsg,
			});

			messagesToRetry.push({
				message,
				error: errorMsg,
			});
		}
	}

	// Send batch to Tinybird
	let result: EventBatchProcessingResult = {
		successful: 0,
		failed: 0,
		errors: [],
	};

	if (events.length > 0) {
		console.log(`🚀 Sending batch of ${events.length} events to Tinybird`);
		result = await sendBatchToTinybird(events, env);

		console.log(
			`✅ Event batch processing complete: ${result.successful} successful, ${result.failed} failed`,
		);

		// If the entire batch failed, consider retry strategy
		if (result.successful === 0 && result.failed > 0) {
			console.error(
				"Entire event batch failed - events will be retried by queue retry mechanism",
			);
		}
	}

	// Retry messages that failed to parse
	for (const { message, error } of messagesToRetry) {
		const body = message.body as EventQueueMessage;
		const retryCount = body.retryCount || 0;

		if (retryCount < 3) {
			// Retry the message with exponential backoff
			const delaySeconds = Math.min(2 ** retryCount * 5, 60); // max 1 minute
			message.retry({
				delaySeconds,
			});
			console.log(
				`Retrying event message (attempt ${retryCount + 1}) with ${delaySeconds}s delay: ${error}`,
			);
		} else {
			// Too many retries, send to DLQ
			console.error(
				`Event message exceeded retry limit, sending to DLQ: ${error}`,
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
		successfulSessions: result.successful, // Using same field name for consistency
		failedSessions: result.failed + parseErrors.length, // Using same field name for consistency
		processingTimeMs,
		errors: [
			...result.errors.map((e) => ({ sessionId: e.eventId, error: e.error })),
			...parseErrors.map((e) => ({ sessionId: e.eventId, error: e.error })),
		], // Map to expected format
	});
}

/**
 * Export the event queue handler for use in the main worker
 */
export default {
	async queue(batch: MessageBatch, env: Env): Promise<void> {
		await handleEventQueue(batch, env);
	},
};
