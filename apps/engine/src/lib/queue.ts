import type { SessionQueueMessage } from "../types/queue";
import type { SessionData } from "./tinybird";

/**
 * Queue service for handling session data ingestion with batching and throttling
 */
export class SessionQueueService {
	private queue: Queue<SessionQueueMessage>;

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
			throw new Error(`Queue enqueue failed: ${error instanceof Error ? error.message : "Unknown error"}`);
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
			throw new Error(`Batch enqueue failed: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	}
}

/**
 * Helper to get or create queue service instance
 */
export function getSessionQueueService(env: Env): SessionQueueService {
	return new SessionQueueService(env);
}