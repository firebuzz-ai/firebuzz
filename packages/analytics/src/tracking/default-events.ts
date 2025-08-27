import type { TrackEventParams } from "../types";
import {
	setupFormSubmissionTracking,
	setupLinkClickTracking,
	setupScrollTracking,
} from "./observers";
import { getViewportDimensions } from "./utils";

// ============================================================================
// Default Event Tracking Setup
// ============================================================================

interface DefaultEventConfig {
	trackEvent: (params: TrackEventParams) => Promise<boolean>;
	eventConfig?: Array<{
		event_id: string;
		event_type: "conversion" | "engagement" | "system";
		event_value: number;
		event_value_currency?: string;
		event_value_type: "static" | "dynamic";
		isCustom: boolean;
	}>;
	externalLinkBehavior?: {
		openInNewTab?: boolean;
	};
	debug?: boolean;
}

/**
 * Setup all default event tracking
 */
export function setupDefaultEventTracking({
	trackEvent,
	eventConfig,
	externalLinkBehavior,
	debug,
}: DefaultEventConfig): () => void {
	const cleanupFunctions: (() => void)[] = [];

	if (debug) {
		console.log("[Analytics] Setting up default event tracking...");
	}

	// Track system events immediately (DOM ready, page load, page unload)
	// Pageview will be triggered after DOM ready
	setupSystemEvents({ trackEvent, eventConfig, debug });

	// Setup ongoing event observers
	cleanupFunctions.push(
		setupScrollTracking({ trackEvent, eventConfig, debug }),
		setupLinkClickTracking({
			trackEvent,
			eventConfig,
			externalLinkBehavior,
			debug,
		}),
		setupFormSubmissionTracking({ trackEvent, eventConfig, debug }),
	);

	// Return cleanup function
	return () => {
		if (debug) {
			console.log("[Analytics] Cleaning up default event tracking...");
		}
		for (const cleanup of cleanupFunctions) cleanup();
	};
}

/**
 * Setup system events (pageload, domready)
 */
// Store page start time globally to avoid duplicates and ensure consistent timing
let globalPageStartTime: number | null = null;
let systemEventsInitialized = false;

// Track sent events to prevent duplicates and for logging
const sentEventIds = new Set<string>();
const trackedEvents: Array<{
	event_id: string;
	event_type: string;
	event_value?: number | string;
	timestamp: number;
	time_on_page?: number;
}> = [];

function getPageStartTime(): number {
	if (globalPageStartTime === null) {
		globalPageStartTime = Date.now();
	}
	return globalPageStartTime;
}

// Helper to check if event was already sent
function isEventSent(eventId: string): boolean {
	return sentEventIds.has(eventId);
}

// Helper to mark event as sent and log it
function markEventAsSent(
	eventId: string,
	eventType: string,
	eventValue?: number | string,
	timeOnPage?: number,
	debug?: boolean,
): void {
	sentEventIds.add(eventId);

	const eventLog = {
		event_id: eventId,
		event_type: eventType,
		event_value: eventValue,
		timestamp: Date.now(),
		time_on_page: timeOnPage,
	};

	trackedEvents.push(eventLog);

	if (debug) {
		console.log("[Analytics] Event tracked:", eventLog);
		console.log("[Analytics] Total tracked events:", trackedEvents.length);
		console.log("[Analytics] All tracked events:", trackedEvents);
	}
}

// Helper to get all tracked events for debugging
export function getAllTrackedEvents(): typeof trackedEvents {
	return [...trackedEvents];
}

// Helper to get event configuration
function getEventConfig(
	eventId: string,
	eventConfig?: DefaultEventConfig["eventConfig"],
) {
	if (!eventConfig) return undefined;
	return eventConfig.find((e) => e.event_id === eventId);
}

function setupSystemEvents({
	trackEvent,
	eventConfig,
	debug,
}: DefaultEventConfig): void {
	// Prevent duplicate system events from being set up
	if (systemEventsInitialized) {
		if (debug) {
			console.log("[Analytics] System events already initialized, skipping");
		}
		return;
	}
	systemEventsInitialized = true;

	const { viewport_width, viewport_height } = getViewportDimensions();
	const pageStartTime = getPageStartTime(); // Use global page start time

	// Track DOM ready event
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", () => {
			const domReadyTime = Date.now();
			const timeOnPageMs = Math.max(domReadyTime - pageStartTime, 100); // Ensure minimum 100ms
			const timeOnPage = Math.round(timeOnPageMs / 1000);

			if (debug) {
				console.log("[Analytics] DOM ready");
			}

			if (!isEventSent("dom-ready")) {
				const timeOnPageValue = Math.max(timeOnPage, 1);
				markEventAsSent("dom-ready", "system", 1, timeOnPageValue, debug);
				trackEvent({
					event_id: "dom-ready",
					event_type: "system",
					event_value: 1,
					event_value_type: "static",
					viewport_width,
					viewport_height,
					dom_ready_time: performance?.now
						? Math.round(performance.now())
						: timeOnPageMs,
					time_on_page: timeOnPageValue,
					metadata: JSON.stringify({
						readyState: document.readyState,
						timestamp: Date.now(),
						domReadyTime: timeOnPageMs,
					}),
				});

				// Pageview will be tracked after page load
			}
		});
	} else {
		// DOM is already ready
		const domReadyTime = Date.now();
		const timeOnPageMs = Math.max(domReadyTime - pageStartTime, 100);
		const timeOnPage = Math.round(timeOnPageMs / 1000);

		if (debug) {
			console.log("[Analytics] DOM ready (already loaded)");
		}

		if (!isEventSent("dom-ready")) {
			const timeOnPageValue = Math.max(timeOnPage, 1);
			markEventAsSent("dom-ready", "system", 1, timeOnPageValue, debug);
			trackEvent({
				event_id: "dom-ready",
				event_type: "system",
				event_value: 1,
				event_value_type: "static",
				viewport_width,
				viewport_height,
				dom_ready_time: performance?.now
					? Math.round(performance.now())
					: timeOnPageMs,
				time_on_page: timeOnPageValue,
				metadata: JSON.stringify({
					readyState: document.readyState,
					timestamp: Date.now(),
					domReadyTime: timeOnPageMs,
				}),
			});

			// Pageview will be tracked after page load
		}
	}

	// Track page load event
	if (document.readyState === "complete") {
		// Page is already loaded
		const loadTime = Date.now();
		const timeOnPageMs = Math.max(loadTime - pageStartTime, 100);
		const timeOnPage = Math.round(timeOnPageMs / 1000);

		if (debug) {
			console.log("[Analytics] Page load (already complete)");
		}

		if (!isEventSent("page-load")) {
			const timeOnPageValue = Math.max(timeOnPage, 1);
			markEventAsSent("page-load", "system", 1, timeOnPageValue, debug);
			trackEvent({
				event_id: "page-load",
				event_type: "system",
				event_value: 1,
				event_value_type: "static",
				viewport_width,
				viewport_height,
				page_load_time: performance?.now
					? Math.round(performance.now())
					: timeOnPageMs,
				time_on_page: timeOnPageValue,
				metadata: JSON.stringify({
					readyState: document.readyState,
					timestamp: Date.now(),
					loadTime: timeOnPageMs,
				}),
			});

			// Track pageview after page load (already complete case)
			setupPageviewTracking({ trackEvent, eventConfig, debug });
		}
	} else {
		window.addEventListener("load", () => {
			const loadTime = Date.now();
			const timeOnPageMs = Math.max(loadTime - pageStartTime, 100);
			const timeOnPage = Math.round(timeOnPageMs / 1000);

			if (debug) {
				console.log("[Analytics] Page load complete");
			}

			if (!isEventSent("page-load")) {
				const timeOnPageValue = Math.max(timeOnPage, 1);
				markEventAsSent("page-load", "system", 1, timeOnPageValue, debug);
				trackEvent({
					event_id: "page-load",
					event_type: "system",
					event_value: 1,
					event_value_type: "static",
					viewport_width,
					viewport_height,
					page_load_time: performance?.now
						? Math.round(performance.now())
						: timeOnPageMs,
					time_on_page: timeOnPageValue,
					metadata: JSON.stringify({
						readyState: document.readyState,
						timestamp: Date.now(),
						loadTime: timeOnPageMs,
					}),
				});

				// Track pageview after page load event
				setupPageviewTracking({ trackEvent, eventConfig, debug });

				// Setup page unload tracking
				setupPageUnloadTracking({ trackEvent, eventConfig, debug });
			}
		});
	}

	// Also setup page unload tracking for immediate page load case
	if (document.readyState === "complete") {
		setupPageUnloadTracking({ trackEvent, eventConfig, debug });
	}
}

/**
 * Setup pageview tracking
 */
function setupPageviewTracking({
	trackEvent,
	eventConfig,
	debug,
}: DefaultEventConfig): void {
	if (isEventSent("page-view")) {
		if (debug) {
			console.log("[Analytics] Page view already tracked, skipping");
		}
		return;
	}

	const { viewport_width, viewport_height } = getViewportDimensions();
	const pageStartTime = getPageStartTime();
	const currentTime = Date.now();
	const timeOnPageMs = Math.max(currentTime - pageStartTime, 100); // Ensure minimum 100ms
	const timeOnPage = Math.round(timeOnPageMs / 1000);

	if (debug) {
		console.log("[Analytics] Tracking pageview");
	}

	const timeOnPageValue = Math.max(timeOnPage, 1); // At least 1 second, but use actual time
	const config = getEventConfig("page-view", eventConfig);

	markEventAsSent(
		"page-view",
		config?.event_type || "engagement",
		config?.event_value || 1,
		timeOnPageValue,
		debug,
	);
	trackEvent({
		event_id: "page-view",
		event_type: config?.event_type || "engagement",
		event_value: config?.event_value,
		event_value_currency: config?.event_value_currency,
		event_value_type: config?.event_value_type || "static",
		viewport_width,
		viewport_height,
		time_on_page: timeOnPageValue,
		metadata: JSON.stringify({
			title: document.title,
			url: window.location.href,
			path: window.location.pathname,
			referrer: document.referrer || undefined,
			timestamp: Date.now(),
			timeOnPageMs: timeOnPageMs,
		}),
	});
}

/**
 * Setup page unload tracking
 */
function setupPageUnloadTracking({
	trackEvent,
	eventConfig,
	debug,
}: DefaultEventConfig): void {
	if (typeof window === "undefined") return;

	const handlePageUnload = () => {
		if (isEventSent("page-unload")) {
			return; // Already tracked
		}

		const { viewport_width, viewport_height } = getViewportDimensions();
		const pageStartTime = getPageStartTime();
		const currentTime = Date.now();
		const timeOnPageMs = Math.max(currentTime - pageStartTime, 100);
		const timeOnPage = Math.round(timeOnPageMs / 1000);
		const config = getEventConfig("page-unload", eventConfig);

		if (debug) {
			console.log("[Analytics] Tracking page unload");
		}

		const timeOnPageValue = Math.max(timeOnPage, 1);
		markEventAsSent(
			"page-unload",
			config?.event_type || "system",
			config?.event_value || 1,
			timeOnPageValue,
			debug,
		);

		// Use synchronous tracking for page unload to ensure delivery
		try {
			trackEvent({
				event_id: "page-unload",
				event_type: config?.event_type || "system",
				event_value: config?.event_value,
				event_value_type: config?.event_value_type || "static",
				viewport_width,
				viewport_height,
				time_on_page: timeOnPageValue,
				metadata: JSON.stringify({
					total_time_on_page: timeOnPageMs,
					page_title: document.title,
					page_url: window.location.href,
					timestamp: Date.now(),
				}),
			});
		} catch (error) {
			if (debug) {
				console.error("[Analytics] Failed to track page unload:", error);
			}
		}
	};

	// Use beforeunload for complete page closure (not just visibility change)
	window.addEventListener("beforeunload", handlePageUnload);
}
