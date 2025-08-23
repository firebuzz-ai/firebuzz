// ============================================================================
// Public API Exports
// ============================================================================

// Main components
export { AnalyticsProvider } from './provider';
export { useAnalytics } from './hooks';

// Types
export type {
  AnalyticsProviderProps,
  TrackEventParams,
  CustomEventConfig,
  AnalyticsContextValue,
  SessionCookieData,
  AttributionCookieData,
  UserCookieData
} from './types';

// Utility functions (for advanced usage)
export {
  getSessionData,
  getAttributionData,
  getUserId,
  getValidSessionId,
  getAbTestData,
  isSessionValid,
  isPreviewEnvironment,
  getAllCookieData
} from './cookies';

// API client (for manual usage)
export { configureApiClient, trackEvent, initializeAnalytics } from './api';

// Default export
export { AnalyticsProvider as default } from './provider';