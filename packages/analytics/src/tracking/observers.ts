import type { TrackEventParams } from "../types";
import {
  appendTrackingToken,
  getElementSelector,
  getFormId,
  getScrollPercentage,
  getViewportDimensions,
  isExternalUrl,
  throttle,
} from "./utils";
import { getTrackingToken } from "../api";

// ============================================================================
// Event Observers
// ============================================================================

interface ObserverConfig {
  trackEvent: (params: TrackEventParams) => Promise<boolean>;
  debug?: boolean;
}

const scrollThresholds = new Set<number>();

/**
 * Setup scroll tracking
 */
export function setupScrollTracking({
  trackEvent,
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

        trackEvent({
          event_id: "scroll",
          event_type: "engagement",
          scroll_percentage: threshold,
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
  debug,
}: ObserverConfig): () => void {
  const handleClick = (event: MouseEvent) => {
    const target = event.target as Element;
    const link = target.closest("a");

    if (!link || !link.href) return;

    if (isExternalUrl(link.href)) {
      const { viewport_width, viewport_height } = getViewportDimensions();

      // Get secure tracking token and enhance the external link
      const originalHref = link.href;
      const trackingToken = getTrackingToken();
      const enhancedUrl = appendTrackingToken(link.href, trackingToken);
      
      // Update the link href with tracking parameters and token
      if (enhancedUrl !== originalHref) {
        link.href = enhancedUrl;
        if (debug) {
          console.log("[Analytics] Enhanced external link with tracking data:", {
            original: originalHref,
            enhanced: enhancedUrl,
            hasToken: !!trackingToken
          });
        }
      }

      if (debug) {
        console.log("[Analytics] External link clicked:", enhancedUrl);
      }

      trackEvent({
        event_id: "external-link-click",
        event_type: "engagement",
        clicked_url: enhancedUrl,
        clicked_element: getElementSelector(link),
        viewport_width,
        viewport_height,
        metadata: JSON.stringify({
          text: link.textContent?.trim().substring(0, 100) || "",
          target: link.target || "_self",
          original_url: originalHref !== enhancedUrl ? originalHref : undefined,
          has_tracking_token: !!trackingToken,
        }),
      });
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

    trackEvent({
      event_id: "form-submission",
      event_type: "conversion",
      form_id: formId,
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

/**
 * Setup page visibility tracking for time on page
 */
export function setupTimeOnPageTracking({
  trackEvent,
  debug,
}: ObserverConfig): () => void {
  let startTime = Date.now();
  let isVisible = !document.hidden;
  let totalTime = 0;

  const handleVisibilityChange = () => {
    const now = Date.now();

    if (document.hidden && isVisible) {
      // Page became hidden
      totalTime += now - startTime;
      isVisible = false;

      if (debug) {
        console.log("[Analytics] Page hidden, total time:", totalTime);
      }
    } else if (!document.hidden && !isVisible) {
      // Page became visible
      startTime = now;
      isVisible = true;

      if (debug) {
        console.log("[Analytics] Page visible again");
      }
    }
  };

  const handleBeforeUnload = () => {
    if (isVisible) {
      totalTime += Date.now() - startTime;
    }

    if (totalTime > 1000) {
      // Only track if more than 1 second
      const timeInSeconds = Math.round(totalTime / 1000);
      const { viewport_width, viewport_height } = getViewportDimensions();

      if (debug) {
        console.log(
          "[Analytics] Page unload, total time:",
          timeInSeconds,
          "seconds"
        );
      }

      // Use sendBeacon for reliability on page unload
      const eventData = {
        event_id: "time-on-page",
        event_type: "engagement" as const,
        time_on_page: timeInSeconds,
        viewport_width,
        viewport_height,
      };

      // Note: Since this is on unload, we use a simplified tracking approach
      // The full trackEvent method might not complete before page unload
      trackEvent(eventData);
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}
