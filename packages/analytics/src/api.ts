import { TrackEventParams, TrackEventResponse, SessionRenewalResponse, SessionInitResponse } from './types';
import { getValidSessionId, getUserId, getAttributionData, getAbTestData } from './cookies';

// ============================================================================
// API Client Configuration
// ============================================================================

interface ApiClientConfig {
  apiUrl: string;
  campaignId: string;
  workspaceId: string;
  projectId: string;
  landingPageId: string;
  debug?: boolean;
}

let globalConfig: ApiClientConfig | null = null;
let currentTrackingToken: string | null = null;

export function configureApiClient(config: ApiClientConfig) {
  globalConfig = config;
}

/**
 * Store tracking token received from session init/renewal
 */
export function setTrackingToken(token: string | undefined) {
  currentTrackingToken = token || null;
  if (globalConfig?.debug && token) {
    console.log('[Analytics] Tracking token stored');
  }
}

/**
 * Get current tracking token
 */
export function getTrackingToken(): string | null {
  return currentTrackingToken;
}

function getConfig(): ApiClientConfig {
  if (!globalConfig) {
    throw new Error('API client not configured. Call configureApiClient() first.');
  }
  return globalConfig;
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateUniqueId(): string {
  return crypto.randomUUID();
}

function log(message: string, ...args: any[]) {
  const config = globalConfig;
  if (config?.debug) {
    console.log(`[Analytics] ${message}`, ...args);
  }
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Initialize a new session
 */
async function initializeSession(sessionId?: string): Promise<SessionInitResponse> {
  const config = getConfig();
  const session_id = sessionId || generateUniqueId();
  
  const userId = getUserId(config.campaignId);
  const attribution = getAttributionData(config.campaignId);
  const abTest = getAbTestData(config.campaignId);
  
  if (!userId || !attribution) {
    throw new Error('Missing required cookie data (user ID or attribution)');
  }
  
  const sessionData = {
    session_id,
    campaign_id: config.campaignId,
    workspace_id: config.workspaceId,
    project_id: config.projectId,
    landing_page_id: config.landingPageId,
    user_id: userId,
    attribution_id: attribution.attributionId,
    ab_test_id: abTest?.testId,
    ab_test_variant_id: abTest?.variantId,
    session_timeout_minutes: 30
  };
  
  log('Initializing session:', sessionData);
  
  const response = await fetch(`${config.apiUrl}/client-api/v1/events/session/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData),
    credentials: 'include' // Include cookies for server to set session cookie
  });
  
  const result = await response.json();
  
  // Store tracking token if provided
  if (result.success && result.data?.tracking_token) {
    setTrackingToken(result.data.tracking_token);
  }
  
  log('Session init result:', result);
  return result;
}

/**
 * Renew an expired session
 */
async function renewSession(oldSessionId: string, newSessionId: string): Promise<SessionRenewalResponse> {
  const config = getConfig();
  
  const renewalData = {
    new_session_id: newSessionId,
    campaign_id: config.campaignId,
    workspace_id: config.workspaceId,
    project_id: config.projectId,
    landing_page_id: config.landingPageId,
    session_timeout_minutes: 30
  };
  
  log('Renewing session:', { oldSessionId, newSessionId, renewalData });
  
  const response = await fetch(`${config.apiUrl}/client-api/v1/events/session/renew`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(renewalData),
    credentials: 'include' // Important: Include cookies so server can set new ones
  });
  
  const result = await response.json();
  
  // Store new tracking token if provided
  if (result.success && result.data?.tracking_token) {
    setTrackingToken(result.data.tracking_token);
  }
  
  log('Session renewal result:', result);
  return result;
}

/**
 * Track an event with automatic session renewal
 */
export async function trackEvent(eventData: TrackEventParams): Promise<boolean> {
  const config = getConfig();
  let sessionId = getValidSessionId(config.campaignId);
  
  if (!sessionId) {
    log('No valid session found, initializing new session');
    const initResult = await initializeSession();
    if (!initResult.success) {
      log('Failed to initialize session:', initResult.error);
      return false;
    }
    sessionId = initResult.data!.session_id;
  }
  
  // Attempt to track event
  const response = await fetch(`${config.apiUrl}/client-api/v1/events/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      session_id: sessionId, 
      ...eventData,
      page_url: eventData.page_url || window.location.href,
      referrer_url: eventData.referrer_url || document.referrer || undefined,
    }),
    credentials: 'include'
  });
  
  const result: TrackEventResponse = await response.json();
  
  // Handle session renewal
  if (!result.success && result.new_session_id) {
    log('Session expired, renewing session');
    
    // Renew session with provided session ID (this will set new cookie!)
    const renewalResult = await renewSession(sessionId, result.new_session_id);
    
    if (renewalResult.success) {
      log('Session renewed successfully, retrying event tracking');
      // Session cookie is now updated by server
      // Tracking token is already stored by renewSession function
      // Retry tracking with new session - recursive call but only once
      return await trackEventOnce({
        ...eventData,
        page_url: eventData.page_url || window.location.href,
        referrer_url: eventData.referrer_url || document.referrer || undefined,
      }, result.new_session_id);
    } else {
      log('Session renewal failed:', renewalResult.error);
      return false;
    }
  }
  
  if (result.success) {
    log('Event tracked successfully:', result.data);
    return true;
  } else {
    log('Event tracking failed:', result.error);
    return false;
  }
}

/**
 * Track event once without retry logic (used internally after session renewal)
 */
async function trackEventOnce(eventData: TrackEventParams, sessionId: string): Promise<boolean> {
  const config = getConfig();
  
  const response = await fetch(`${config.apiUrl}/client-api/v1/events/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, ...eventData }),
    credentials: 'include'
  });
  
  const result: TrackEventResponse = await response.json();
  
  if (result.success) {
    log('Event tracked successfully on retry:', result.data);
    return true;
  } else {
    log('Event tracking failed on retry:', result.error);
    return false;
  }
}

/**
 * Initialize analytics session on page load
 */
export async function initializeAnalytics(): Promise<boolean> {
  const config = getConfig();
  const sessionId = getValidSessionId(config.campaignId);
  
  if (sessionId) {
    log('Valid session found:', sessionId);
    // Note: We don't have tracking token for existing sessions
    // Token will be created on next server interaction (event tracking)
    return true;
  }
  
  log('No valid session, initializing new session');
  const result = await initializeSession();
  // Tracking token is automatically stored by initializeSession
  return result.success;
}