import type { CampaignConfig } from "@firebuzz/shared-types/campaign";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { generateUniqueId, generateUserId } from "../utils/id-generator";
import { parseRequest } from "./request";

// Re-export for compatibility
export { generateUniqueId };

// ============================================================================
// Constants
// ============================================================================

export const COOKIE_PREFIX = "frbzz_";

// Environment-aware cookie helpers
const getUserIdCookie = (campaignId?: string, isPreview = false) => {
	if (isPreview && campaignId) {
		// In preview mode, scope user ID by campaign to prevent cross-customer collisions
		return `${COOKIE_PREFIX}uid_${campaignId}`;
	}
	return `${COOKIE_PREFIX}uid`;
};
const getSessionCookie = (campaignId: string) =>
	`${COOKIE_PREFIX}session_${campaignId}`;

// ============================================================================
// Types
// ============================================================================

export interface SessionData {
	sessionId: string;
	campaignId: string;
	landingPageId?: string;
	abTest?: {
		testId: string;
		variantId: string;
	};
	createdAt: number;
	sessionEndsAt: number;
}

export interface SessionResult {
	isReturning: boolean;
	sessionData?: SessionData;
	shouldUseExistingVariant: boolean;
	existingVariantId?: string;
}

export interface UserData {
	userId: string;
	createdAt: number;
}

export interface EnsureSessionResult {
	session: SessionData;
	userId: string;
	isReturningUser: boolean;
	isExistingSession: boolean;
}

// ============================================================================
// Cookie Utilities
// ============================================================================

/**
 * Ensure user has a persistent user ID cookie
 * This cookie persists for 2 years and is used to identify returning users
 */
export async function ensureUserId(
	c: Context,
	campaignId: string,
	isPreview = false,
): Promise<string> {
	const userCookie = getCookie(c, getUserIdCookie(campaignId, isPreview));
	const userData = parseCookieValue<UserData>(userCookie);
	const parsedRequest = parseRequest(c);

	if (userData?.userId) {
		// Valid user ID exists
		return userData.userId;
	}

	// Create new user ID
	const userId = await generateUserId(
		campaignId,
		parsedRequest.firebuzz.realIp || "",
		parsedRequest.traffic.userAgent || "",
	);

	return userId;
}

/**
 * Check if user is returning based on user ID cookie
 * A returning user is someone who has visited before (has a user ID cookie)
 * regardless of session state
 */
export function isReturningUser(
	c: Context,
	campaignId?: string,
	isPreview = false,
): boolean {
	const userCookie = getCookie(c, getUserIdCookie(campaignId, isPreview));
	const userData = parseCookieValue<UserData>(userCookie);
	return userData !== null && userData.userId !== undefined;
}

/**
 * Parse JSON cookie value safely
 */
function parseCookieValue<T>(value: string | undefined): T | null {
	if (!value) return null;
	try {
		return JSON.parse(decodeURIComponent(value)) as T;
	} catch {
		return null;
	}
}

/**
 * Encode cookie value as JSON (Hono's setCookie will handle URL encoding)
 */
export function encodeCookieValue(data: unknown): string {
	return JSON.stringify(data);
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Check for existing session and determine if user is returning
 */
export function checkExistingSession(
	c: Context,
	campaignId: string,
): SessionResult {
	// Get existing cookies (campaign-scoped)
	const sessionCookie = getCookie(c, getSessionCookie(campaignId));

	// Parse existing data
	const existingSession = parseCookieValue<SessionData>(sessionCookie);

	// Check if session is still valid
	if (existingSession && existingSession.campaignId === campaignId) {
		const sessionAge = Date.now() - existingSession.createdAt;
		const sessionDurationMs = 30 * 60 * 1000;

		if (sessionAge < sessionDurationMs) {
			// Valid session exists
			return {
				isReturning: true,
				sessionData: existingSession,
				shouldUseExistingVariant: !!existingSession.abTest,
				existingVariantId: existingSession.abTest?.variantId,
			};
		}
	}

	// No valid session
	return {
		isReturning: false,
		sessionData: undefined,
		shouldUseExistingVariant: false,
	};
}

/**
 * Create a new session for the user
 */
export function createSession(
	campaignId: string,
	sessionDurationInMinutes: number,
): SessionData {
	const sessionId = generateUniqueId();
	const now = Date.now();

	// Build session data
	const sessionData: SessionData = {
		sessionId,
		campaignId,
		createdAt: now,
		sessionEndsAt: now + sessionDurationInMinutes * 60 * 1000,
	};

	return sessionData;
}

/**
 * Create a base session (no AB test or landing page data)
 * Used when we want the session cookie set before evaluation
 */
export function createBaseSession(campaignId: string): SessionData {
	const sessionId = generateUniqueId();
	const now = Date.now();

	const sessionData: SessionData = {
		sessionId,
		campaignId,
		createdAt: now,
		sessionEndsAt: now + 30 * 60 * 1000,
	};

	return sessionData;
}

/**
 * Ensure there is a valid session and attribution; sets cookies when creating new ones.
 * Returns current session, attribution, user ID, and flags for returning user and existing session.
 */
export async function ensureSession(
	c: Context,
	campaignConfig: CampaignConfig,
	isPreview = false,
): Promise<EnsureSessionResult> {
	// First ensure user has a persistent user ID
	const userId = await ensureUserId(c, campaignConfig.campaignId, isPreview);
	const isReturningUserFlag = isReturningUser(
		c,
		campaignConfig.campaignId,
		isPreview,
	);

	const sessionCheck = checkExistingSession(c, campaignConfig.campaignId);

	let session: SessionData;
	let isExistingSession = false;

	if (sessionCheck.isReturning && sessionCheck.sessionData) {
		session = sessionCheck.sessionData;
		isExistingSession = true;
	} else {
		// Create and persist a base session for new users
		session = createBaseSession(campaignConfig.campaignId);
		isExistingSession = false;
	}

	return {
		session,
		userId,
		isReturningUser: isReturningUserFlag,
		isExistingSession,
	};
}

// ============================================================================
// Main Session Handler
// ============================================================================

/**
 * Main function to handle session management
 * Returns session data and whether to use existing variant
 */
export function handleSession(
	c: Context,
	campaignId: string,
): {
	session: SessionData;
	isReturning: boolean;
	useExistingVariant: boolean;
} {
	// Check for existing session
	const sessionCheck = checkExistingSession(c, campaignId);

	// Handle session
	let session: SessionData;

	if (sessionCheck.isReturning && sessionCheck.sessionData) {
		// Use existing session
		session = sessionCheck.sessionData;
	} else {
		// Create new session
		session = createSession(campaignId, 30);
	}

	return {
		session,
		isReturning: sessionCheck.isReturning,
		useExistingVariant: sessionCheck.shouldUseExistingVariant,
	};
}

// ============================================================================
// Session Data Getters
// ============================================================================

/**
 * Get current session data from cookies for a specific campaign
 */
export function getCurrentSession(
	c: Context,
	campaignId: string,
): SessionData | null {
	const sessionCookie = getCookie(c, getSessionCookie(campaignId));
	return parseCookieValue<SessionData>(sessionCookie);
}

/**
 * Get current user ID from cookies
 */
export function getCurrentUserId(
	c: Context,
	campaignId?: string,
	isPreview = false,
): string | null {
	const cookieName = getUserIdCookie(campaignId, isPreview);
	const userCookie = getCookie(c, cookieName);
	const userData = parseCookieValue<UserData>(userCookie);
	const userId = userData?.userId || null;

	// Debug logging for user ID cookie reading
	console.log("getCurrentUserId debug:", {
		campaignId,
		isPreview,
		expected_cookie_name: cookieName,
		raw_cookie_value: userCookie || "NOT FOUND",
		parsed_userData: userData || "FAILED TO PARSE",
		final_userId: userId || "NO USER ID",
		all_cookies: c.req.header("cookie") || "NO COOKIES IN REQUEST",
	});

	return userId;
}

/**
 * Get campaign-scoped cookie names for external reference
 * Useful for debugging or direct cookie manipulation
 */
export function getCampaignCookieNames(campaignId: string, isPreview = false) {
	return {
		session: getSessionCookie(campaignId),
		userId: getUserIdCookie(campaignId, isPreview),
	};
}
