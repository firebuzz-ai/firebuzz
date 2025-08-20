import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { CampaignConfig } from "../types/campaign";

// ============================================================================
// Constants
// ============================================================================

export const COOKIE_PREFIX = "fb_";
const SESSION_COOKIE = `${COOKIE_PREFIX}session`;
const ATTRIBUTION_COOKIE = `${COOKIE_PREFIX}attribution`;

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
}

export interface AttributionData {
	attributionId: string;
	campaignId: string;
	createdAt: number;
	source?: string;
	medium?: string;
	campaign?: string;
}

export interface SessionResult {
	isReturning: boolean;
	sessionData?: SessionData;
	attributionData?: AttributionData;
	shouldUseExistingVariant: boolean;
	existingVariantId?: string;
}

export interface EnsureSessionResult {
	session: SessionData;
	attribution: AttributionData;
	isReturning: boolean;
}

// ============================================================================
// Cookie Utilities
// ============================================================================

/**
 * Generate a globally unique ID for sessions and attribution
 * Uses UUIDv7 which has better database performance due to time-ordering
 * This ensures true uniqueness and excellent sortability/indexing performance
 */
export function generateUniqueId(): string {
	// Generate UUIDv7 - time-ordered UUID with better DB performance
	return generateUUIDv7();
}

/**
 * Generate a UUIDv7 - time-ordered UUID with millisecond precision
 * Uses crypto.randomUUID() for random parts and replaces timestamp portion
 * Format: tttttttt-tttt-7xxx-yxxx-xxxxxxxxxxxx
 * Where t = timestamp, 7 = version, x = random, y = variant bits
 */
function generateUUIDv7(timestamp: Date = new Date()): string {
	const serializedTimestamp = timestamp
		.valueOf()
		.toString(16)
		.padStart(12, "0");
	const baseUUID = crypto.randomUUID();
	return `${serializedTimestamp.slice(0, 8)}-${serializedTimestamp.slice(8, 12)}-7${baseUUID.slice(15)}`;
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
 * Encode cookie value as JSON
 */
export function encodeCookieValue(data: unknown): string {
	return encodeURIComponent(JSON.stringify(data));
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
	config: CampaignConfig,
): SessionResult {
	// Get existing cookies
	const sessionCookie = getCookie(c, SESSION_COOKIE);
	const attributionCookie = getCookie(c, ATTRIBUTION_COOKIE);

	// Parse existing data
	const existingSession = parseCookieValue<SessionData>(sessionCookie);
	const existingAttribution =
		parseCookieValue<AttributionData>(attributionCookie);

	// Check if session is still valid
	if (existingSession && existingSession.campaignId === campaignId) {
		const sessionAge = Date.now() - existingSession.createdAt;
		const sessionDurationMs = config.sessionDurationInMinutes * 60 * 1000;

		if (sessionAge < sessionDurationMs) {
			// Valid session exists
			return {
				isReturning: true,
				sessionData: existingSession,
				attributionData: existingAttribution || undefined,
				shouldUseExistingVariant: !!existingSession.abTest,
				existingVariantId: existingSession.abTest?.variantId,
			};
		}
	}

	// Check if attribution is still valid (for conversion tracking)
	if (existingAttribution && existingAttribution.campaignId === campaignId) {
		const attributionAge = Date.now() - existingAttribution.createdAt;
		const attributionPeriodMs =
			config.attributionPeriodInDays * 24 * 60 * 60 * 1000;

		if (attributionAge < attributionPeriodMs) {
			// Valid attribution exists but session expired
			return {
				isReturning: false, // New session needed
				sessionData: undefined,
				attributionData: existingAttribution || undefined,
				shouldUseExistingVariant: false,
			};
		}
	}

	// No valid session or attribution
	return {
		isReturning: false,
		sessionData: undefined,
		attributionData: undefined,
		shouldUseExistingVariant: false,
	};
}

/**
 * Create a new session for the user
 */
export function createSession(
	c: Context,
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
	};

	// Set session cookie
	setCookie(c, SESSION_COOKIE, encodeCookieValue(sessionData), {
		maxAge: sessionDurationInMinutes * 60, // Convert minutes to seconds
		httpOnly: false, // Accessible on client side as requested
		secure: true, // Only over HTTPS
		sameSite: "Lax",
		path: "/",
	});

	return sessionData;
}

/**
 * Create a base session (no AB test or landing page data)
 * Used when we want the session cookie set before evaluation
 */
export function createBaseSession(
	c: Context,
	campaignId: string,
	config: CampaignConfig,
): SessionData {
	const sessionId = generateUniqueId();
	const now = Date.now();

	const sessionData: SessionData = {
		sessionId,
		campaignId,
		createdAt: now,
	};

	setCookie(c, SESSION_COOKIE, encodeCookieValue(sessionData), {
		maxAge: config.sessionDurationInMinutes * 60,
		httpOnly: false,
		secure: true,
		sameSite: "Lax",
		path: "/",
	});

	return sessionData;
}

/**
 * Update session with AB test variant selection
 */
export function updateSessionWithVariant(
	c: Context,
	sessionData: SessionData,
	sessionDurationInMinutes: number,
	testId: string,
	variantId: string,
): void {
	const maxAge =
		sessionDurationInMinutes * 60 - (Date.now() - sessionData.createdAt);

	// Update cookie with variant data
	setCookie(
		c,
		SESSION_COOKIE,
		encodeCookieValue({ ...sessionData, abTest: { testId, variantId } }),
		{
			maxAge,
			httpOnly: false,
			secure: true,
			sameSite: "Lax",
			path: "/",
		},
	);
}

/**
 * Create or update attribution tracking
 */
export function createAttribution(
	c: Context,
	campaignId: string,
	config: CampaignConfig,
	source?: string,
	medium?: string,
	campaign?: string,
): AttributionData {
	// Check for existing attribution
	const existingCookie = getCookie(c, ATTRIBUTION_COOKIE);
	const existing = parseCookieValue<AttributionData>(existingCookie);

	// If valid attribution exists for same campaign, return it
	if (existing && existing.campaignId === campaignId) {
		const age = Date.now() - existing.createdAt;
		const maxAge = config.attributionPeriodInDays * 24 * 60 * 60 * 1000;

		if (age < maxAge) {
			return existing;
		}
	}

	// Create new attribution
	const attributionData: AttributionData = {
		attributionId: generateUniqueId(),
		campaignId,
		createdAt: Date.now(),
		source,
		medium,
		campaign,
	};

	// Set attribution cookie
	setCookie(c, ATTRIBUTION_COOKIE, encodeCookieValue(attributionData), {
		maxAge: config.attributionPeriodInDays * 24 * 60 * 60, // Convert days to seconds
		httpOnly: false,
		secure: true,
		sameSite: "Lax",
		path: "/",
	});

	return attributionData;
}

/**
 * Ensure there is a valid session and attribution; sets cookies when creating new ones.
 * Returns current session, attribution and isReturning flag for evaluation usage.
 */
export function ensureSessionAndAttribution(
	c: Context,
	campaignConfig: CampaignConfig,
): EnsureSessionResult {
	const sessionCheck = checkExistingSession(
		c,
		campaignConfig.campaignId,
		campaignConfig,
	);

	// Parse UTM parameters for attribution creation
	const url = new URL(c.req.url);
	const utmSource = url.searchParams.get("utm_source") || undefined;
	const utmMedium = url.searchParams.get("utm_medium") || undefined;
	const utmCampaign = url.searchParams.get("utm_campaign") || undefined;

	const attribution =
		sessionCheck.attributionData ||
		createAttribution(
			c,
			campaignConfig.campaignId,
			campaignConfig,
			utmSource,
			utmMedium,
			utmCampaign,
		);

	let session: SessionData;
	let isReturning = false;

	if (sessionCheck.isReturning && sessionCheck.sessionData) {
		session = sessionCheck.sessionData;
		isReturning = true;
	} else {
		// Create and persist a base session for new users
		session = createBaseSession(c, campaignConfig.campaignId, campaignConfig);
		isReturning = false;
	}

	return { session, attribution, isReturning };
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
	config: CampaignConfig,
): {
	session: SessionData;
	attribution: AttributionData;
	isReturning: boolean;
	useExistingVariant: boolean;
} {
	// Check for existing session
	const sessionCheck = checkExistingSession(c, campaignId, config);

	// Get UTM parameters for attribution
	const url = new URL(c.req.url);
	const utmSource = url.searchParams.get("utm_source") || undefined;
	const utmMedium = url.searchParams.get("utm_medium") || undefined;
	const utmCampaign = url.searchParams.get("utm_campaign") || undefined;

	// Handle attribution (create or reuse)
	const attribution =
		sessionCheck.attributionData ||
		createAttribution(c, campaignId, config, utmSource, utmMedium, utmCampaign);

	// Handle session
	let session: SessionData;

	if (sessionCheck.isReturning && sessionCheck.sessionData) {
		// Use existing session
		session = sessionCheck.sessionData;
	} else {
		// Create new session
		session = createSession(c, campaignId, config.sessionDurationInMinutes);
	}

	return {
		session,
		attribution,
		isReturning: sessionCheck.isReturning,
		useExistingVariant: sessionCheck.shouldUseExistingVariant,
	};
}

// ============================================================================
// Session Data Getters
// ============================================================================

/**
 * Get current session data from cookies
 */
export function getCurrentSession(c: Context): SessionData | null {
	const sessionCookie = getCookie(c, SESSION_COOKIE);
	return parseCookieValue<SessionData>(sessionCookie);
}

/**
 * Get current attribution data from cookies
 */
export function getCurrentAttribution(c: Context): AttributionData | null {
	const attributionCookie = getCookie(c, ATTRIBUTION_COOKIE);
	return parseCookieValue<AttributionData>(attributionCookie);
}

/**
 * Clear all session cookies
 */
export function clearSession(c: Context): void {
	setCookie(c, SESSION_COOKIE, "", { maxAge: 0, path: "/" });
	setCookie(c, ATTRIBUTION_COOKIE, "", { maxAge: 0, path: "/" });
}
