import { getConfig, getSessionData, log, renewSession } from "./api";
import type { FirebuzzSessionContext, TrackEventParams } from "./types";
import { generateUniqueId } from "./utils/uuid";

// ============================================================================
// Batching Configuration
// ============================================================================

interface BatchConfig {
	maxBatchSize: number; // Maximum events per batch
	maxWaitTime: number; // Maximum time to wait before flushing (ms)
	debounceTime: number; // Debounce time between events (ms)
}

const DEFAULT_BATCH_CONFIG: BatchConfig = {
	maxBatchSize: 10, // Send batch after 10 events
	maxWaitTime: 2000, // Send batch after 2 seconds max
	debounceTime: 100, // Wait 100ms after last event before considering batch
};

interface BatchItem {
	eventData: TrackEventParams;
	timestamp: number;
	retryCount: number;
}

interface BatchResponse {
	success: boolean;
	data?: {
		processed_events: number;
		events_in_buffer: number;
		flushed_to_tinybird: boolean;
		batch_id: string;
	};
	error?: string;
	new_session_id?: string;
	processed_events?: number;
}

// ============================================================================
// Event Batch Tracker
// ============================================================================

export class EventBatchTracker {
	private batch: BatchItem[] = [];
	private flushTimer: number | null = null;
	private debounceTimer: number | null = null;
	private config: BatchConfig;
	private isProcessing = false;

	constructor(config: Partial<BatchConfig> = {}) {
		this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
	}

	/**
	 * Add an event to the batch with debouncing
	 */
	async addEvent(eventData: TrackEventParams): Promise<boolean> {
		const batchItem: BatchItem = {
			eventData,
			timestamp: Date.now(),
			retryCount: 0,
		};

		this.batch.push(batchItem);

		log("📦 Event added to batch:", {
			event_id: eventData.event_id,
			event_type: eventData.event_type,
			batch_size: this.batch.length,
			max_batch_size: this.config.maxBatchSize,
			debounce_time: this.config.debounceTime,
		});

		// Clear existing debounce timer
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		// Immediate flush if batch is full
		if (this.batch.length >= this.config.maxBatchSize) {
			log("🚀 Batch full, flushing immediately");
			return await this.flushBatch();
		}

		// Set up debounce timer
		this.debounceTimer = setTimeout(() => {
			this.processBatchWithTimer();
		}, this.config.debounceTime) as unknown as number;

		return true;
	}

	/**
	 * Process batch after debounce period
	 */
	private processBatchWithTimer(): void {
		if (this.batch.length === 0) return;

		log("⏱️ Debounce timer expired, scheduling batch flush");

		// Clear existing flush timer
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
		}

		// Set up flush timer with remaining time
		const oldestEvent = Math.min(...this.batch.map((item) => item.timestamp));
		const elapsed = Date.now() - oldestEvent;
		const remainingWaitTime = Math.max(0, this.config.maxWaitTime - elapsed);

		if (remainingWaitTime <= 0) {
			// Max wait time exceeded, flush immediately
			this.flushBatch().catch((error) => {
				log("❌ Timer flush batch error:", error);
			});
		} else {
			// Wait for remaining time before flushing
			this.flushTimer = setTimeout(() => {
				this.flushBatch().catch((error) => {
					log("❌ Timer flush batch error:", error);
				});
			}, remainingWaitTime) as unknown as number;
		}
	}

	/**
	 * Flush the current batch to the server
	 */
	async flushBatch(): Promise<boolean> {
		if (this.isProcessing || this.batch.length === 0) {
			return true;
		}

		this.isProcessing = true;

		// Clear timers
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = null;
		}

		const batchToSend = [...this.batch];
		this.batch = []; // Clear current batch

		log("🚀 Flushing batch:", {
			event_count: batchToSend.length,
			events: batchToSend.map((item) => ({
				event_id: item.eventData.event_id,
				event_type: item.eventData.event_type,
				timestamp: item.timestamp,
				retry_count: item.retryCount,
			})),
		});

		try {
			const success = await this.sendBatch(batchToSend);
			this.isProcessing = false;
			return success;
		} catch (error) {
			log("❌ Batch flush error:", error);

			// Re-add failed events to the batch for retry
			const failedItems = batchToSend
				.map((item) => ({
					...item,
					retryCount: item.retryCount + 1,
				}))
				.filter((item) => item.retryCount <= 3); // Max 3 retries

			this.batch.unshift(...failedItems);
			this.isProcessing = false;
			return false;
		}
	}

	/**
	 * Send batch synchronously using sendBeacon for reliable delivery during page unload
	 */
	flushBatchSync(): boolean {
		if (this.batch.length === 0) return true;

		const config = getConfig();
		const sessionData = getSessionData();

		if (!sessionData || !sessionData.sessionId) {
			log(
				"❌ No session data found for sync batch, cannot send (session expired and no renewal possible during page unload)",
			);
			return false;
		}

		const sessionId = sessionData.sessionId;

		// Get session context for campaign environment
		const sessionContext: FirebuzzSessionContext | null =
			typeof window !== "undefined"
				? window.__FIREBUZZ_SESSION_CONTEXT__ || null
				: null;

		const requestPayload = {
			events: this.batch.map((item) => ({
				...item.eventData,
				session_id: sessionId,
				page_url: item.eventData.page_url || window.location.href,
				referrer_url:
					item.eventData.referrer_url || document.referrer || undefined,
				campaign_environment: sessionContext?.campaignEnvironment || "production",
			})),
		};

		const url = `${config.apiUrl}/client-api/v1/events/batch-track`;
		const payloadString = JSON.stringify(requestPayload);

		log("🚨 Sending sync batch via sendBeacon:", {
			session_id: sessionId,
			event_count: requestPayload.events.length,
			url,
			beacon_supported: !!navigator.sendBeacon,
		});

		// Try sendBeacon first (most reliable for page unload)
		if (navigator.sendBeacon) {
			const blob = new Blob([payloadString], { type: "application/json" });
			const success = navigator.sendBeacon(url, blob);

			if (success) {
				log("✅ Sync batch sent via sendBeacon");
				this.batch = []; // Clear the batch on success
				return true;
			}
			log("❌ sendBeacon failed, trying fetch with keepalive");
		}

		// Fallback to fetch with keepalive
		try {
			fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: payloadString,
				keepalive: true, // Allows request to continue after page unload
			});
			log("✅ Sync batch sent via fetch with keepalive");
			this.batch = []; // Clear the batch
			return true;
		} catch (error) {
			log("❌ Sync batch failed:", error);
			return false;
		}
	}

	/**
	 * Send batch to server
	 */
	private async sendBatch(batchItems: BatchItem[]): Promise<boolean> {
		const config = getConfig();
		const sessionData = getSessionData();

		if (!sessionData || !sessionData.sessionId) {
			log("⚠️ No session data found for batch, renewing session");
			try {
				// Generate new session ID and renew (handles missing session data)
				const newSessionId = generateUniqueId();
				const oldSessionId = sessionData?.sessionId || "expired";

				const result = await renewSession(oldSessionId, newSessionId);
				if (result.success) {
					log("✅ Session renewed for batch:", newSessionId);
					// Session data will be updated by renewSession, so we can proceed
				} else {
					log("❌ Failed to renew session for batch:", result.error);
					return false;
				}
			} catch (error) {
				log("❌ Error renewing session for batch:", error);
				return false;
			}
		}

		const sessionId = getSessionData()?.sessionId;
		if (!sessionId) {
			log("❌ Still no session ID available after renewal attempt");
			return false;
		}

		// Get session context for campaign environment
		const sessionContext: FirebuzzSessionContext | null =
			typeof window !== "undefined"
				? window.__FIREBUZZ_SESSION_CONTEXT__ || null
				: null;

		const requestPayload = {
			events: batchItems.map((item) => ({
				...item.eventData,
				session_id: sessionId, // Add session_id to each event
				event_value_currency:
					item.eventData.event_value_currency ||
					config.defaultCurrency ||
					"USD",
				page_url: item.eventData.page_url || window.location.href,
				referrer_url:
					item.eventData.referrer_url || document.referrer || undefined,
				campaign_environment: sessionContext?.campaignEnvironment || "production",
			})),
		};

		log("📦 Sending batch to API:", {
			session_id: sessionId,
			event_count: requestPayload.events.length,
			events: requestPayload.events.map((e) => ({
				event_id: e.event_id,
				event_type: e.event_type,
			})),
			url: `${config.apiUrl}/client-api/v1/events/batch-track`,
		});

		const response = await fetch(
			`${config.apiUrl}/client-api/v1/events/batch-track`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestPayload),
				credentials: "include",
			},
		);

		const result: BatchResponse = await response.json();

		if (result.success) {
			log("✅ Batch sent successfully:", result.data);
			return true;
		}

		// Handle session renewal for batch
		if (result.new_session_id) {
			log("🔄 Session expired during batch, handling renewal");

			// Renew session with provided session ID
			const renewalResult = await renewSession(
				sessionId,
				result.new_session_id,
			);

			if (renewalResult.success) {
				log("✅ Batch session renewed successfully, retrying batch");
				// Retry the batch with renewed session - this will get the new session ID from session data
				return await this.sendBatch(batchItems);
			}

			log("❌ Batch session renewal failed:", renewalResult.error);
			return false;
		}

		log("❌ Batch failed:", result.error);
		return false;
	}

	/**
	 * Force flush any pending events (called on page unload)
	 */
	async forceFlush(): Promise<void> {
		if (this.batch.length > 0) {
			log("🚨 Force flushing batch on page unload");
			await this.flushBatch();
		}
	}

	/**
	 * Get current batch size
	 */
	getBatchSize(): number {
		return this.batch.length;
	}

	/**
	 * Clear all pending events and timers
	 */
	clear(): void {
		this.batch = [];
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = null;
		}
	}
}

// ============================================================================
// Global Batch Tracker Instance
// ============================================================================

let globalBatchTracker: EventBatchTracker | null = null;

export function getBatchTracker(
	config?: Partial<BatchConfig>,
): EventBatchTracker {
	if (!globalBatchTracker) {
		globalBatchTracker = new EventBatchTracker(config);

		// Set up page unload handler to force flush
		if (typeof window !== "undefined") {
			// Enhanced page unload handling with sendBeacon for reliable delivery
			window.addEventListener("beforeunload", () => {
				if (globalBatchTracker && globalBatchTracker.getBatchSize() > 0) {
					log("🚨 Page unloading, attempting sync flush");
					const success = globalBatchTracker.flushBatchSync();
					if (!success) {
						log("❌ Failed to flush batch on beforeunload");
					}
				}
			});

			// Enhanced visibility change handling
			document.addEventListener("visibilitychange", () => {
				if (document.visibilityState === "hidden") {
					if (globalBatchTracker && globalBatchTracker.getBatchSize() > 0) {
						log("🚨 Page hidden, attempting sync flush");
						globalBatchTracker.flushBatchSync();
					}
				}
			});

			// Additional page hide event for better compatibility
			window.addEventListener("pagehide", () => {
				if (globalBatchTracker && globalBatchTracker.getBatchSize() > 0) {
					log("🚨 Page hide event, attempting sync flush");
					globalBatchTracker.flushBatchSync();
				}
			});
		}
	}
	return globalBatchTracker;
}

export function clearBatchTracker(): void {
	if (globalBatchTracker) {
		globalBatchTracker.clear();
		globalBatchTracker = null;
	}
}
