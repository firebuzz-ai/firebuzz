import type { TrackEventParams } from "../types";
import {
  setupFormSubmissionTracking,
  setupLinkClickTracking,
  setupScrollTracking,
  setupTimeOnPageTracking,
} from "./observers";
import { getViewportDimensions } from "./utils";

// ============================================================================
// Default Event Tracking Setup
// ============================================================================

interface DefaultEventConfig {
  trackEvent: (params: TrackEventParams) => Promise<boolean>;
  debug?: boolean;
}

/**
 * Setup all default event tracking
 */
export function setupDefaultEventTracking({
  trackEvent,
  debug,
}: DefaultEventConfig): () => void {
  const cleanupFunctions: (() => void)[] = [];

  if (debug) {
    console.log("[Analytics] Setting up default event tracking...");
  }

  // Track system events immediately
  setupSystemEvents({ trackEvent, debug });

  // Track pageview
  setupPageviewTracking({ trackEvent, debug });

  // Setup ongoing event observers
  cleanupFunctions.push(
    setupScrollTracking({ trackEvent, debug }),
    setupLinkClickTracking({ trackEvent, debug }),
    setupFormSubmissionTracking({ trackEvent, debug }),
    setupTimeOnPageTracking({ trackEvent, debug })
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
function setupSystemEvents({ trackEvent, debug }: DefaultEventConfig): void {
  const { viewport_width, viewport_height } = getViewportDimensions();

  // Track DOM ready event
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (debug) {
        console.log("[Analytics] DOM ready");
      }

      trackEvent({
        event_id: "domready",
        event_type: "system",
        viewport_width,
        viewport_height,
        metadata: JSON.stringify({
          readyState: document.readyState,
          timestamp: Date.now(),
        }),
      });
    });
  } else {
    // DOM is already ready
    if (debug) {
      console.log("[Analytics] DOM ready (already loaded)");
    }

    trackEvent({
      event_id: "domready",
      event_type: "system",
      viewport_width,
      viewport_height,
      metadata: JSON.stringify({
        readyState: document.readyState,
        timestamp: Date.now(),
      }),
    });
  }

  // Track page load event
  if (document.readyState === "complete") {
    // Page is already loaded
    if (debug) {
      console.log("[Analytics] Page load (already complete)");
    }

    trackEvent({
      event_id: "pageload",
      event_type: "system",
      viewport_width,
      viewport_height,
      page_load_time: performance.now(),
      metadata: JSON.stringify({
        readyState: document.readyState,
        timestamp: Date.now(),
      }),
    });
  } else {
    window.addEventListener("load", () => {
      if (debug) {
        console.log("[Analytics] Page load complete");
      }

      trackEvent({
        event_id: "pageload",
        event_type: "system",
        viewport_width,
        viewport_height,
        page_load_time: performance.now(),
        metadata: JSON.stringify({
          readyState: document.readyState,
          timestamp: Date.now(),
        }),
      });
    });
  }
}

/**
 * Setup pageview tracking
 */
function setupPageviewTracking({
  trackEvent,
  debug,
}: DefaultEventConfig): void {
  const { viewport_width, viewport_height } = getViewportDimensions();

  if (debug) {
    console.log("[Analytics] Tracking pageview");
  }

  trackEvent({
    event_id: "pageview",
    event_type: "engagement",
    viewport_width,
    viewport_height,
    metadata: JSON.stringify({
      title: document.title,
      url: window.location.href,
      referrer: document.referrer || undefined,
      timestamp: Date.now(),
    }),
  });
}
