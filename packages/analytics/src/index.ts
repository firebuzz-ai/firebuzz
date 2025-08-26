// ============================================================================
// Public API Exports
// ============================================================================

// Main components
export { AnalyticsProvider } from "./provider";
export { useAnalytics } from "./hooks";

// Types
export type {
	AnalyticsProviderProps,
	TrackEventParams,
	EventConfig,
	AnalyticsContextValue,
	SessionCookieData,
	AttributionCookieData,
	UserCookieData,
} from "./types";

// Utility functions (for advanced usage)
export {
	getSessionData,
	getAttributionData,
	getUserId,
	getValidSessionId,
	getAbTestData,
	isSessionValid,
	isPreviewEnvironment,
	getAllCookieData,
} from "./cookies";

// Environment detection utilities
export { isWebContainer, shouldDisableAnalytics } from "./utils/environment";

// API client (for manual usage)
export { configureApiClient, trackEvent, initializeAnalytics } from "./api";

// Debug utilities
export { getAllTrackedEvents } from "./tracking/default-events";

// Batching utilities (for advanced usage)
export { getBatchTracker, clearBatchTracker } from "./batch-tracker";

// Default export
export { AnalyticsProvider as default } from "./provider";
