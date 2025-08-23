import Cookies from "js-cookie";
import type {
  SessionCookieData,
  AttributionCookieData,
  UserCookieData,
} from "./types";

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Detect if we're in a preview environment based on hostname
 */
export function isPreviewEnvironment(): boolean {
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname;
  return (
    hostname.includes("preview.frbzz.com") ||
    (hostname.startsWith("preview-") && hostname.includes(".frbzz.com"))
  );
}

// ============================================================================
// Cookie Utilities
// ============================================================================

/**
 * Get cookie name for user ID based on environment
 */
function getUserIdCookie(campaignId: string, isPreview: boolean): string {
  return isPreview ? `frbzz_uid_${campaignId}` : "frbzz_uid";
}

/**
 * Get session cookie name for campaign
 */
function getSessionCookie(campaignId: string): string {
  return `frbzz_session_${campaignId}`;
}

/**
 * Get attribution cookie name for campaign
 */
function getAttributionCookie(campaignId: string): string {
  return `frbzz_attribution_${campaignId}`;
}

/**
 * Parse JSON cookie value safely (js-cookie handles URL decoding automatically)
 */
function parseCookieValue<T>(value: string | undefined): T | null {
  if (!value) return null;
  
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn("Failed to parse cookie value:", { 
      value, 
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Get cookie value by name using js-cookie (handles decoding automatically)
 */
function getCookieValue(name: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return Cookies.get(name);
}

// ============================================================================
// Cookie Readers
// ============================================================================

/**
 * Get session data from cookie
 */
export function getSessionData(campaignId: string): SessionCookieData | null {
  const sessionCookie = getCookieValue(getSessionCookie(campaignId));
  return parseCookieValue<SessionCookieData>(sessionCookie);
}

/**
 * Get attribution data from cookie
 */
export function getAttributionData(
  campaignId: string
): AttributionCookieData | null {
  const attributionCookie = getCookieValue(getAttributionCookie(campaignId));
  return parseCookieValue<AttributionCookieData>(attributionCookie);
}

/**
 * Get user ID from cookie
 */
export function getUserId(campaignId: string): string | null {
  const isPreview = isPreviewEnvironment();
  const userCookie = getCookieValue(getUserIdCookie(campaignId, isPreview));
  const userData = parseCookieValue<UserCookieData>(userCookie);
  return userData?.userId || null;
}

/**
 * Get all cookie names for debugging
 */
export function getCampaignCookieNames(campaignId: string) {
  const isPreview = isPreviewEnvironment();
  return {
    session: getSessionCookie(campaignId),
    attribution: getAttributionCookie(campaignId),
    userId: getUserIdCookie(campaignId, isPreview),
  };
}

// ============================================================================
// Session Validation
// ============================================================================

/**
 * Check if session is valid based on cookie data
 */
export function isSessionValid(sessionData: SessionCookieData): boolean {
  if (!sessionData) return false;

  if (sessionData.sessionEndsAt) {
    // Use sessionEndsAt if available
    return Date.now() < sessionData.sessionEndsAt;
  }

  // Fallback: assume session duration is 30 minutes if not provided
  const assumedDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
  return Date.now() - sessionData.createdAt < assumedDuration;
}

/**
 * Get session ID from cookie if valid
 */
export function getValidSessionId(campaignId: string): string | null {
  const sessionData = getSessionData(campaignId);
  if (!sessionData) return null;

  if (isSessionValid(sessionData)) {
    return sessionData.sessionId;
  }

  return null;
}

/**
 * Extract AB test data from session cookie
 */
export function getAbTestData(
  campaignId: string
): { testId: string; variantId: string } | null {
  const sessionData = getSessionData(campaignId);
  if (!sessionData?.abTest) return null;

  return {
    testId: sessionData.abTest.testId,
    variantId: sessionData.abTest.variantId,
  };
}

// ============================================================================
// Debug Utilities
// ============================================================================

/**
 * Get all campaign cookie data for debugging
 */
export function getAllCookieData(campaignId: string) {
  return {
    session: getSessionData(campaignId),
    attribution: getAttributionData(campaignId),
    userId: getUserId(campaignId),
    abTest: getAbTestData(campaignId),
    isPreview: isPreviewEnvironment(),
    cookieNames: getCampaignCookieNames(campaignId),
  };
}
