import { getTrackingToken } from "../api";
import { getBatchTracker } from "../batch-tracker";
import type { TrackEventParams } from "../types";
import {
	appendTrackingToken,
	getElementSelector,
	getFormId,
	getScrollPercentage,
	getTimeOnPage,
	getViewportDimensions,
	isExternalUrl,
	throttle,
} from "./utils";

// ============================================================================
// Event Observers
// ============================================================================

interface ObserverConfig {
	trackEvent: (params: TrackEventParams) => Promise<boolean>;
	eventConfig?: Array<{
		event_id: string;
		event_type: "conversion" | "engagement" | "system";
		event_value: number;
		event_value_type: "static" | "dynamic";
		isCustom: boolean;
	}>;
	externalLinkBehavior?: {
		openInNewTab?: boolean;
	};
	debug?: boolean;
}

const scrollThresholds = new Set<number>();

/**
 * Get event configuration
 */
function getEventConfig(
	eventId: string,
	eventConfig?: ObserverConfig["eventConfig"],
) {
	if (!eventConfig) return undefined;
	return eventConfig.find((e) => e.event_id === eventId);
}

/**
 * Setup scroll tracking
 */
export function setupScrollTracking({
	trackEvent,
	eventConfig,
	debug,
}: ObserverConfig): () => void {
	const handleScroll = throttle(() => {
		const percentage = getScrollPercentage();
		const { viewport_width, viewport_height } = getViewportDimensions();

		// Track at 25%, 50%, 75%, 100% thresholds
		const thresholds = [25, 50, 75, 100];

		for (const threshold of thresholds) {
			if (percentage >= threshold && !scrollThresholds.has(threshold)) {
				scrollThresholds.add(threshold);

				if (debug) {
					console.log(`[Analytics] Scroll tracking: ${threshold}%`);
				}

				const eventId = `scroll-threshold-${threshold}`;
				const config = getEventConfig(eventId, eventConfig);

				trackEvent({
					event_id: eventId,
					event_type: config?.event_type || "engagement",
					event_value: config?.event_value,
					event_value_type: config?.event_value_type || "static",
					scroll_percentage: threshold,
					time_on_page: getTimeOnPage(),
					viewport_width,
					viewport_height,
					metadata: JSON.stringify({ threshold, actualPercentage: percentage }),
				});
			}
		}
	}, 250);

	window.addEventListener("scroll", handleScroll, { passive: true });

	return () => {
		window.removeEventListener("scroll", handleScroll);
		scrollThresholds.clear();
	};
}

/**
 * Setup external link click tracking
 */
export function setupLinkClickTracking({
	trackEvent,
	eventConfig,
	externalLinkBehavior,
	debug,
}: ObserverConfig): () => void {
	const handleClick = (event: MouseEvent) => {
		const target = event.target as Element;
		const link = target.closest("a");

		if (!link || !link.href) return;

		if (isExternalUrl(link.href)) {
			const { viewport_width, viewport_height } = getViewportDimensions();

			// Get secure tracking click ID and enhance the external link
			const originalHref = link.href;
			const clickId = getTrackingToken();
			const enhancedUrl = appendTrackingToken(link.href, clickId);

			// Update the link href with tracking parameters and click ID
			if (enhancedUrl !== originalHref) {
				link.href = enhancedUrl;
				if (debug) {
					console.log(
						"[Analytics] Enhanced external link with tracking data:",
						{
							original: originalHref,
							enhanced: enhancedUrl,
							hasClickId: !!clickId,
						},
					);
				}
			}

			// Apply external link behavior configuration
			if (externalLinkBehavior?.openInNewTab) {
				link.target = "_blank";
				link.rel = "noopener noreferrer";
				if (debug) {
					console.log(
						"[Analytics] Configured external link to open in new tab",
					);
				}
			}

			if (debug) {
				console.log("[Analytics] External link clicked:", enhancedUrl);
			}

			const config = getEventConfig("external-link-click", eventConfig);

			trackEvent({
				event_id: "external-link-click",
				event_type: config?.event_type || "engagement",
				event_value: config?.event_value,
				event_value_type: config?.event_value_type || "static",
				clicked_url: enhancedUrl,
				clicked_element: getElementSelector(link),
				time_on_page: getTimeOnPage(),
				viewport_width,
				viewport_height,
				metadata: JSON.stringify({
					text: link.textContent?.trim().substring(0, 100) || "",
					target: link.target || "_self",
					original_url: originalHref !== enhancedUrl ? originalHref : undefined,
					has_click_id: !!clickId,
				}),
			});

			// Immediate flush for external links to prevent data loss on navigation
			try {
				const batchTracker = getBatchTracker();
				if (batchTracker && batchTracker.getBatchSize() > 0) {
					if (debug) {
						console.log(
							"[Analytics] 🔗 External link clicked, force flushing batch",
						);
					}
					// Use sync flush to ensure delivery before navigation
					batchTracker.flushBatchSync();
				}
			} catch (error) {
				if (debug) {
					console.error(
						"[Analytics] Failed to flush batch for external link:",
						error,
					);
				}
			}
		}
	};

	document.addEventListener("click", handleClick);

	return () => {
		document.removeEventListener("click", handleClick);
	};
}

/**
 * Setup form submission tracking
 */
export function setupFormSubmissionTracking({
	trackEvent,
	eventConfig,
	debug,
}: ObserverConfig): () => void {
	const handleSubmit = (event: SubmitEvent) => {
		const form = event.target as HTMLFormElement;
		if (!form) return;

		const formId = getFormId(form);
		const { viewport_width, viewport_height } = getViewportDimensions();

		if (debug) {
			console.log("[Analytics] Form submitted:", formId);
		}

		// Get form data for metadata (be careful not to log sensitive data)
		const formData = new FormData(form);
		const fieldCount = Array.from(formData.keys()).length;

		const config = getEventConfig("form-submission", eventConfig);

		trackEvent({
			event_id: "form-submission",
			event_type: config?.event_type || "conversion",
			event_value: config?.event_value,
			event_value_type: config?.event_value_type || "static",
			form_id: formId,
			time_on_page: getTimeOnPage(),
			viewport_width,
			viewport_height,
			metadata: JSON.stringify({
				fieldCount,
				method: form.method || "GET",
				action: form.action || window.location.href,
			}),
		});
	};

	document.addEventListener("submit", handleSubmit);

	return () => {
		document.removeEventListener("submit", handleSubmit);
	};
}

// Removed setupTimeOnPageTracking as time_on_page should be calculated per event, not as a separate event
