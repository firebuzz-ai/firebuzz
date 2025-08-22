import type { Env } from '../env';
import type { SessionQueueMessage } from '../types/queue';
import type { SessionData } from './tinybird';

/**
 * Adaptive queue service that handles high-volume traffic
 * Uses multiple strategies to scale beyond single queue limits
 */
export class AdaptiveSessionQueueService {
	private env: Env;
	private queues: Queue<SessionQueueMessage>[];

	constructor(env: Env) {
		this.env = env;
		// In a real implementation, you'd configure multiple queues
		// For now, we use the single queue but the pattern is here
		this.queues = [env.SESSION_QUEUE];
	}

	/**
	 * Smart enqueue with load balancing and fallbacks
	 */
	async enqueue(sessionData: SessionData): Promise<void> {
		const message: SessionQueueMessage = {
			type: 'session',
			data: sessionData,
			timestamp: new Date().toISOString(),
			retryCount: 0,
		};

		// Strategy 1: Hash-based queue selection for even distribution
		const queueIndex = this.selectQueue(sessionData.session_id);
		const primaryQueue = this.queues[queueIndex];

		try {
			await primaryQueue.send(message);
			return;
		} catch (error) {
			console.warn(`Primary queue failed, trying fallback: ${error}`);
		}

		// Strategy 2: Try other queues if primary fails
		for (let i = 0; i < this.queues.length; i++) {
			if (i === queueIndex) continue; // Skip primary queue

			try {
				await this.queues[i].send(message);
				return;
			} catch (error) {
				console.warn(`Queue ${i} failed: ${error}`);
			}
		}

		// Strategy 3: Circuit breaker - if all queues fail, store in KV for later processing
		await this.fallbackToKV(message);
	}

	/**
	 * Select queue based on session ID hash for even distribution
	 */
	private selectQueue(sessionId: string): number {
		// Simple hash to distribute sessions across queues
		const hash = sessionId.split('').reduce((acc, char) => {
			return ((acc << 5) - acc + char.charCodeAt(0)) & 0x7fffffff;
		}, 0);
		return hash % this.queues.length;
	}

	/**
	 * Fallback storage in KV when queues are unavailable
	 * This prevents data loss during high load or outages
	 */
	private async fallbackToKV(message: SessionQueueMessage): Promise<void> {
		try {
			const key = `fallback_session:${Date.now()}:${message.data.session_id}`;
			await this.env.CACHE.put(key, JSON.stringify(message), {
				// Store for 24 hours
				expirationTtl: 24 * 60 * 60,
				// Add metadata for recovery job
				metadata: {
					type: 'fallback_session',
					timestamp: message.timestamp,
				},
			});

			console.log(`Session stored in KV fallback: ${key}`);
		} catch (error) {
			console.error('Critical: Failed to store session data anywhere:', error);
			// This is the only true failure case - log for manual recovery
		}
	}

	/**
	 * Batch processing with intelligent sizing
	 */
	async enqueueBatch(sessions: SessionData[]): Promise<void> {
		// Split large batches to avoid overwhelming single queue
		const BATCH_SIZE = 50; // Smaller than queue consumer batch size

		for (let i = 0; i < sessions.length; i += BATCH_SIZE) {
			const batch = sessions.slice(i, i + BATCH_SIZE);

			// Process batches in parallel across queues
			await Promise.allSettled(batch.map((session) => this.enqueue(session)));
		}
	}
}

/**
 * Recovery service to process KV fallback data
 * This would run as a scheduled worker (cron job)
 */
export class FallbackRecoveryService {
	constructor(private env: Env) {}

	/**
	 * Process fallback sessions from KV storage
	 * Run this as a scheduled worker every 5 minutes
	 */
	async processFallbackSessions(): Promise<{
		processed: number;
		failed: number;
	}> {
		const result = { processed: 0, failed: 0 };

		try {
			// List all fallback session keys
			const list = await this.env.CACHE.list({
				prefix: 'fallback_session:',
				limit: 100, // Process in batches
			});

			const queueService = new AdaptiveSessionQueueService(this.env);

			for (const key of list.keys) {
				try {
					const data = await this.env.CACHE.get(key.name, 'text');
					if (!data) continue;

					const message: SessionQueueMessage = JSON.parse(data);

					// Try to re-enqueue
					await queueService.enqueue(message.data);

					// Remove from KV if successful
					await this.env.CACHE.delete(key.name);
					result.processed++;
				} catch (error) {
					console.error(`Failed to process fallback session ${key.name}:`, error);
					result.failed++;
				}
			}
		} catch (error) {
			console.error('Failed to process fallback sessions:', error);
		}

		console.log(`Fallback recovery: ${result.processed} processed, ${result.failed} failed`);
		return result;
	}
}
