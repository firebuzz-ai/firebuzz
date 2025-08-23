// Event tracking interface
export interface TrackEventParams {
  event_id: string;              // e.g., "form-submission", "pageload", "external-link-click"
  event_type: 'conversion' | 'engagement' | 'system';
  event_value?: string;          // Actual value as string (e.g., "10", "20")
  event_value_type?: 'static' | 'dynamic';
  
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

// Analytics Provider configuration
export interface AnalyticsProviderProps {
  apiUrl: string;                      // e.g., "https://engine.firebuzz.com"
  campaignId: string;                  // Required to read correct cookies
  workspaceId: string;                 // From landing page context
  projectId: string;                   // From landing page context
  landingPageId: string;              // Current landing page
  // Note: abTestId and abTestVariantId are automatically read from cookies
  customEvents?: CustomEventConfig[]; // Additional custom events
  cookiePrefix?: string;              // Default: "frbzz_"
  enableDefaultEvents?: boolean;      // Default: true
  enabled?: boolean;                  // Default: true - disable entire analytics system
  debug?: boolean;                    // Console logging
  children: React.ReactNode;
}

// Custom event configuration
export interface CustomEventConfig {
  event_id: string;
  event_type: 'conversion' | 'engagement' | 'system';
  selector?: string;    // CSS selector for automatic tracking
  trigger?: 'click' | 'submit' | 'load' | 'scroll';
  value?: string;       // Static value
}

// Cookie data structures
export interface SessionCookieData {
  sessionId: string;
  campaignId: string;
  landingPageId?: string;
  abTest?: {
    testId: string;
    variantId: string;
  };
  createdAt: number;
  sessionEndsAt?: number; // Recommended addition to engine
}

export interface AttributionCookieData {
  attributionId: string;
  campaignId: string;
  createdAt: number;
  source?: string;
  medium?: string;
  campaign?: string;
}

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
    tracking_token?: string;
  };
}

export interface SessionInitResponse {
  success: boolean;
  error?: string;
  data?: {
    session_id: string;
    tracking_token?: string;
  };
}