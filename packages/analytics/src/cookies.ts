import Cookies from "js-cookie";
import type {
	AttributionCookieData,
	SessionCookieData,
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
// Test Mode Support
// ============================================================================

// Mock cookie data for testing
let mockCookies: Record<string, string> = {};
let testMode = false;

export function enableTestMode(mockData?: {
	session?: SessionCookieData;
	attribution?: AttributionCookieData;
	userId?: string;
}) {
	testMode = true;
	mockCookies = {};

	if (mockData) {
		// Set mock session cookie
		if (mockData.session) {
			const sessionName = `frbzz_session_${mockData.session.campaignId}`;
			mockCookies[sessionName] = JSON.stringify(mockData.session);
		}

		// Set mock attribution cookie
		if (mockData.attribution) {
			const attributionName = `frbzz_attribution_${mockData.attribution.campaignId}`;
			mockCookies[attributionName] = JSON.stringify(mockData.attribution);
		}

		// Set mock user ID cookie
		if (mockData.userId) {
			const userCookie = {
				userId: mockData.userId,
				createdAt: Date.now(),
			};
			mockCookies.frbzz_uid = JSON.stringify(userCookie);
		}
	}

	console.log("[Analytics] Test mode enabled with mock cookies:", mockCookies);
}

export function disableTestMode() {
	testMode = false;
	mockCookies = {};
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
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Get cookie value by name using js-cookie (handles decoding automatically)
 */
function getCookieValue(name: string): string | undefined {
	if (typeof window === "undefined") return undefined;

	// Use mock cookies in test mode
	if (testMode) {
		return mockCookies[name];
	}

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
	campaignId: string,
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
 * Get session ID without validation (includes expired sessions)
 * This allows the server to handle session renewal
 */
export function getSessionId(campaignId: string): string | null {
	const sessionData = getSessionData(campaignId);
	return sessionData?.sessionId || null;
}

/**
 * Extract AB test data from session cookie
 */
export function getAbTestData(
	campaignId: string,
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
