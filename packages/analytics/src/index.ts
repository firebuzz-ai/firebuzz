// ============================================================================
// Public API Exports
// ============================================================================

// API client (for manual usage)
export { configureApiClient, initializeAnalytics, trackEvent } from "./api";
// Batching utilities (for advanced usage)
export { clearBatchTracker, getBatchTracker } from "./batch-tracker";
// Main components
export { useAnalytics } from "./hooks";
// Default export
export { AnalyticsProvider, AnalyticsProvider as default } from "./provider";

// Debug utilities
export { getAllTrackedEvents } from "./tracking/default-events";
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
