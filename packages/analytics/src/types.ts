// Event tracking interface
export interface TrackEventParams {
  event_id: string; // e.g., "form-submission", "pageload", "external-link-click"
  event_type: "conversion" | "engagement" | "system";
  event_value?: number; // Actual value as number (e.g., 10, 20)
  event_value_currency?: string; // Currency code (e.g., "USD", "EUR")
  event_value_type?: "static" | "dynamic";

  // Optional event-specific data
  form_id?: string;
  clicked_element?: string;
  clicked_url?: string;
  page_load_time?: number;
  dom_ready_time?: number;
  scroll_percentage?: number;
  time_on_page?: number;
  viewport_width?: number;
  viewport_height?: number;
  metadata?: string;
  page_url?: string;
  referrer_url?: string;
}

// Session data interface (from session context)
export interface SessionData {
  userId: string;
  sessionId: string;
  campaignId: string;
  landingPageId?: string;
  abTestId?: string | null;
  abTestVariantId?: string | null;
}

// Consent state interface (from consent manager)
export interface ConsentState {
  hasUserInteracted: boolean;
  analytics: boolean;
  marketing: boolean;
  shouldTrack: boolean;
}

// Analytics Provider configuration
export interface AnalyticsProviderProps {
  apiUrl: string; // e.g., "https://engine.firebuzz.com"

  // Session data from session context (required)
  sessionData: SessionData;

  // Consent state from consent manager (required)
  consentState: ConsentState;

  // Campaign configuration
  campaignSlug?: string; // Campaign slug for proper config lookup (production)
  workspaceId: string; // From landing page context
  projectId: string; // From landing page context
  landingPageId: string; // From landing page context

  // Event configuration
  customEvents?: EventConfig[]; // Additional custom events
  primaryGoal: EventConfig; // Primary goal
  defaultCurrency?: string; // Default currency for events (default: "USD")
  enableDefaultEvents?: boolean; // Default: true

  // System configuration
  enabled?: boolean; // Default: true - disable entire analytics system
  debug?: boolean; // Console logging

  // Batching configuration
  batching?: {
    enabled?: boolean; // Default: true
    maxBatchSize?: number; // Default: 10
    maxWaitTime?: number; // Default: 2000ms
    debounceTime?: number; // Default: 100ms
  };

  // External link behavior
  externalLinkBehavior?: {
    openInNewTab?: boolean; // Default: false - force external links to open in new tab
  };

  // Session timeout (for internal state management)
  sessionTimeoutMinutes?: number; // Default: 30 - session timeout in minutes

  children: React.ReactNode;
}

// Custom event configuration
export interface EventConfig {
  event_id: string;
  event_type: "conversion" | "engagement" | "system";
  event_value: number;
  event_value_currency?: string; // Currency code (e.g., "USD", "EUR")
  event_value_type: "static" | "dynamic";
  isCustom: boolean;
}

// Legacy types (kept for compatibility but deprecated)
/** @deprecated Use SessionData from session context instead */
export interface SessionCookieData {
  sessionId: string;
  campaignId: string;
  landingPageId?: string;
  abTest?: {
    testId: string;
    variantId: string;
  };
  createdAt: number;
  sessionEndsAt?: number;
}

/** @deprecated Attribution logic removed */
export interface AttributionCookieData {
  attributionId: string;
  campaignId: string;
  createdAt: number;
  source?: string;
  medium?: string;
  campaign?: string;
}

/** @deprecated Use SessionData.userId instead */
export interface UserCookieData {
  userId: string;
  createdAt: number;
}

// Analytics context interface
export interface AnalyticsContextValue {
  trackEvent: (params: TrackEventParams) => Promise<boolean>;
  sessionId: string | null;
  userId: string | null;
  isInitialized: boolean;
  debug: boolean;
}

// API response types
export interface TrackEventResponse {
  success: boolean;
  error?: string;
  new_session_id?: string;
  data?: {
    event_sequence: number;
    events_in_buffer: number;
    flushed_to_tinybird: boolean;
  };
}

export interface SessionRenewalResponse {
  success: boolean;
  error?: string;
  data?: {
    session_id: string;
    click_id?: string; // Changed from tracking_token to click_id
    session_duration_minutes?: number;
    user_id?: string;
    ab_test_id?: string;
    ab_test_variant_id?: string;
  };
}

export interface SessionInitResponse {
  success: boolean;
  error?: string;
  data?: {
    session_id: string;
    click_id?: string; // Changed from tracking_token to click_id
    session_duration_minutes?: number;
  };
}
