import type { EventData } from "@firebuzz/shared-types/events";
import type { EventQueueMessage, SessionQueueMessage } from "../types/queue";
import type { SessionData } from "./tinybird";

/**
 * Queue service for handling session data ingestion with batching and throttling
 */
export class SessionQueueService {
	private queue: Queue;

	constructor(env: Env) {
		this.queue = env.SESSION_QUEUE;
	}

	/**
	 * Send a session to the queue for batch processing
	 */
	async enqueue(sessionData: SessionData): Promise<void> {
		const message: SessionQueueMessage = {
			type: "session",
			data: sessionData,
			timestamp: new Date().toISOString(),
			retryCount: 0,
		};

		try {
			await this.queue.send(message, {
				// Optional: Add delay if you want to spread out processing
				// delaySeconds: Math.random() * 5, // 0-5 seconds random delay
			});
		} catch (error) {
			console.error("Failed to enqueue session:", error);
			// Fallback: Try direct ingestion if queue fails
			throw new Error(
				`Queue enqueue failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Send multiple sessions to the queue
	 */
	async enqueueBatch(sessions: SessionData[]): Promise<void> {
		const messages: SessionQueueMessage[] = sessions.map((data) => ({
			type: "session",
			data,
			timestamp: new Date().toISOString(),
			retryCount: 0,
		}));

		try {
			// Send all messages to the queue
			await Promise.all(messages.map((msg) => this.queue.send(msg)));
		} catch (error) {
			console.error("Failed to enqueue batch:", error);
			throw new Error(
				`Batch enqueue failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}
}

/**
 * Queue service for handling event data ingestion with batching and throttling
 */
export class EventQueueService {
	private queue: Queue;

	constructor(env: Env) {
		this.queue = env.EVENT_QUEUE;
	}

	/**
	 * Send an event to the queue for batch processing
	 */
	async enqueue(eventData: EventData): Promise<void> {
		const message: EventQueueMessage = {
			type: "event",
			data: eventData,
			timestamp: new Date().toISOString(),
			retryCount: 0,
		};

		try {
			await this.queue.send(message, {
				// Optional: Add delay if you want to spread out processing
				// delaySeconds: Math.random() * 2, // 0-2 seconds random delay
			});

			console.log("🚀 Event queued for processing:", {
				event_id: eventData.event_id,
				internal_id: eventData.id,
				session_id: eventData.session_id,
				timestamp: message.timestamp,
			});
		} catch (error) {
			console.error("Failed to enqueue event:", error);
			// Fallback: Try direct ingestion if queue fails
			throw new Error(
				`Event queue enqueue failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Send multiple events to the queue
	 */
	async enqueueBatch(events: EventData[]): Promise<void> {
		const messages: EventQueueMessage[] = events.map((data) => ({
			type: "event",
			data,
			timestamp: new Date().toISOString(),
			retryCount: 0,
		}));

		try {
			// Send all messages to the queue
			await Promise.all(messages.map((msg) => this.queue.send(msg)));

			console.log("🚀 Event batch queued for processing:", {
				event_count: events.length,
				event_ids: events.map((e) => ({
					event_id: e.event_id,
					internal_id: e.id,
				})),
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			console.error("Failed to enqueue event batch:", error);
			throw new Error(
				`Event batch enqueue failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}
}

/**
 * Helper to get or create queue service instance
 */
export function getSessionQueueService(env: Env): SessionQueueService {
	return new SessionQueueService(env);
}

/**
 * Helper to get or create event queue service instance
 */
export function getEventQueueService(env: Env): EventQueueService {
	return new EventQueueService(env);
}
