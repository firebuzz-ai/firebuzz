// ============================================================================
// Public API Exports
// ============================================================================

// Main components
export { useAnalytics } from "./hooks";
export { AnalyticsProvider } from "./provider";

// Types
export type {
  AnalyticsContextValue,
  AnalyticsProviderProps,
  EventConfig,
  SessionCookieData,
  TrackEventParams,
  UserCookieData,
} from "./types";

// Environment detection utilities
export { isWebContainer, shouldDisableAnalytics } from "./utils/environment";

// API client (for manual usage)
export { configureApiClient, initializeAnalytics, trackEvent } from "./api";

// Debug utilities
export { getAllTrackedEvents } from "./tracking/default-events";

// Batching utilities (for advanced usage)
export { clearBatchTracker, getBatchTracker } from "./batch-tracker";

// Default export
export { AnalyticsProvider as default } from "./provider";
