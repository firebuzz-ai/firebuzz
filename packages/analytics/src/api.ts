import { getBatchTracker } from "./batch-tracker";
import {
	getAbTestData,
	getAttributionData,
	getSessionId,
	getUserId,
	getValidSessionId,
} from "./cookies";
import type {
	SessionInitResponse,
	SessionRenewalResponse,
	TrackEventParams,
	TrackEventResponse,
} from "./types";

// ============================================================================
// API Client Configuration
// ============================================================================

interface ApiClientConfig {
	apiUrl: string;
	campaignId: string;
	campaignSlug?: string; // Add campaign slug for proper config lookup
	workspaceId: string;
	projectId: string;
	landingPageId: string;
	debug?: boolean;
	sessionTimeoutMinutes?: number;
	batching?: {
		enabled: boolean;
		maxBatchSize?: number;
		maxWaitTime?: number;
		debounceTime?: number;
	};
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
		console.log("[Analytics] Tracking token stored");
	}
}

/**
 * Get current tracking token
 */
export function getTrackingToken(): string | null {
	return currentTrackingToken;
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateUniqueId(): string {
	return crypto.randomUUID();
}

export function log(message: string, ...args: unknown[]) {
	const config = globalConfig;
	if (config?.debug) {
		console.log(`[Analytics] ${message}`, ...args);
	}
}

export function getConfig(): ApiClientConfig {
	if (!globalConfig) {
		throw new Error(
			"API client not configured. Call configureApiClient() first.",
		);
	}
	return globalConfig;
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Initialize a new session
 */
async function initializeSession(
	sessionId?: string,
): Promise<SessionInitResponse> {
	const config = getConfig();
	const session_id = sessionId || generateUniqueId();

	const userId = getUserId(config.campaignId);
	const attribution = getAttributionData(config.campaignId);
	const abTest = getAbTestData(config.campaignId);

	// For session renewal, if cookies are missing, let the server handle it
	// The server can generate new user ID and attribution if needed
	if (!userId && !attribution) {
		log(
			"Warning: Both user ID and attribution cookies are missing, server will create new ones",
		);
	} else if (!userId) {
		log("Warning: User ID cookie is missing, server will create new one");
	} else if (!attribution) {
		log("Warning: Attribution cookie is missing, server will create new one");
	}

	const sessionData = {
		session_id,
		campaign_id: config.campaignId,
		workspace_id: config.workspaceId,
		project_id: config.projectId,
		landing_page_id: config.landingPageId,
		user_id: userId || undefined, // Let server generate if missing
		attribution_id: attribution?.attributionId || undefined, // Let server generate if missing
		ab_test_id: abTest?.testId,
		ab_test_variant_id: abTest?.variantId,
		session_timeout_minutes: config.sessionTimeoutMinutes || 30,
	};

	log("Initializing session:", sessionData);

	let response: Response;
	let result: SessionInitResponse;

	try {
		response = await fetch(
			`${config.apiUrl}/client-api/v1/events/session/init`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(sessionData),
				credentials: "include", // Include cookies for server to set session cookie
			},
		);

		result = await response.json();
	} catch (error) {
		// Handle network errors gracefully
		log("Session init failed - network error:", error);
		return { success: false, error: "Network error - analytics disabled" };
	}

	// Store tracking token if provided
	if (result.success && result.data?.tracking_token) {
		setTrackingToken(result.data.tracking_token);
	}

	log("Session init result:", result);

	// If successful, create session cookie on client-side (server can't set cross-domain cookies)
	if (result.success && result.data?.session_id) {
		// Use session duration from server response (includes campaign settings)
		const sessionDurationMinutes =
			result.data.session_duration_minutes ||
			config.sessionTimeoutMinutes ||
			30;

		const sessionCookie = {
			sessionId: result.data.session_id,
			campaignId: config.campaignId,
			createdAt: Date.now(),
			sessionEndsAt: Date.now() + sessionDurationMinutes * 60 * 1000,
		};

		// Import Cookies if not already imported
		const Cookies = (await import("js-cookie")).default;

		// Set session cookie on client-side
		Cookies.set(
			`frbzz_session_${config.campaignId}`,
			JSON.stringify(sessionCookie),
			{
				expires: sessionDurationMinutes / (24 * 60), // Convert minutes to days
				secure: true,
				sameSite: "Lax",
				path: "/",
			},
		);

		log(
			"✅ Session cookie set client-side with duration:",
			sessionDurationMinutes,
			"minutes",
		);
	}

	// Debug: Check what cookies are actually available after API call
	log("Debug - Cookies after API call:", document.cookie);

	return result;
}

/**
 * Renew an expired session
 */
export async function renewSession(
	oldSessionId: string,
	newSessionId: string,
): Promise<SessionRenewalResponse> {
	const config = getConfig();

	// Extract campaign slug from URL path (e.g., "/campaign-slug" -> "campaign-slug")
	const campaignSlug =
		typeof window !== "undefined"
			? window.location.pathname.split("/").filter(Boolean)[0]
			: config.campaignSlug; // Fallback to provided slug

	const renewalData = {
		new_session_id: newSessionId,
		campaign_id: config.campaignId,
		campaign_slug: campaignSlug, // Auto-detect from URL or use provided
		workspace_id: config.workspaceId,
		project_id: config.projectId,
		landing_page_id: config.landingPageId,
		session_timeout_minutes: config.sessionTimeoutMinutes || 30,
	};

	log("Renewing session:", { oldSessionId, newSessionId, renewalData });

	let response: Response;
	let result: SessionRenewalResponse;

	try {
		response = await fetch(
			`${config.apiUrl}/client-api/v1/events/session/renew`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(renewalData),
				credentials: "include", // Important: Include cookies so server can set new ones
			},
		);

		result = await response.json();
	} catch (error) {
		// Handle network errors gracefully
		log("Session renewal failed - network error:", error);
		return { success: false, error: "Network error - analytics disabled" };
	}

	// Store new tracking token if provided
	if (result.success && result.data?.tracking_token) {
		setTrackingToken(result.data.tracking_token);
	}

	// If successful, create all cookies on client-side (server can't set cross-domain cookies)
	if (result.success && result.data?.session_id) {
		// Use session duration from server response (includes campaign settings)
		const sessionDurationMinutes =
			result.data.session_duration_minutes ||
			config.sessionTimeoutMinutes ||
			30;

		// Import Cookies if not already imported
		const Cookies = (await import("js-cookie")).default;

		// 1. Set session cookie
		const sessionCookie = {
			sessionId: result.data.session_id,
			campaignId: config.campaignId,
			createdAt: Date.now(),
			sessionEndsAt: Date.now() + sessionDurationMinutes * 60 * 1000,
		};

		Cookies.set(
			`frbzz_session_${config.campaignId}`,
			JSON.stringify(sessionCookie),
			{
				expires: sessionDurationMinutes / (24 * 60), // Convert minutes to days
				secure: true,
				sameSite: "Lax",
				path: "/",
			},
		);

		// 2. Set user cookie if provided (may be newly generated)
		if (result.data.user_id) {
			const userCookie = {
				userId: result.data.user_id,
				createdAt: Date.now(),
			};

			Cookies.set(
				`frbzz_uid_${config.campaignId}`,
				JSON.stringify(userCookie),
				{
					expires: 400, // 400 days
					secure: true,
					sameSite: "Lax",
					path: "/",
				},
			);

			log("✅ User cookie set:", result.data.user_id);
		}

		// 3. Set attribution cookie if provided (may be newly generated)
		if (result.data.attribution_id) {
			// Use attribution duration from server response (includes campaign settings)
			const attributionDurationDays =
				result.data.attribution_duration_days || 30;

			const attributionCookie = {
				attributionId: result.data.attribution_id,
				campaignId: config.campaignId,
				createdAt: Date.now(),
			};

			Cookies.set(
				`frbzz_attribution_${config.campaignId}`,
				JSON.stringify(attributionCookie),
				{
					expires: attributionDurationDays, // Use campaign-configured attribution period
					secure: true,
					sameSite: "Lax",
					path: "/",
				},
			);

			log(
				"✅ Attribution cookie set with duration:",
				attributionDurationDays,
				"days",
			);
		}

		log(
			"✅ All cookies renewed with session duration:",
			sessionDurationMinutes,
			"minutes",
		);
	}

	log("Session renewal result:", result);
	return result;
}

/**
 * Track an event with automatic session renewal and optional batching
 */
export async function trackEvent(
	eventData: TrackEventParams,
): Promise<boolean> {
	const config = getConfig();

	// Check if batching is enabled
	if (config.batching?.enabled) {
		log("📦 Batching enabled, adding event to batch:", {
			event_id: eventData.event_id,
			event_type: eventData.event_type,
		});

		const batchTracker = getBatchTracker({
			maxBatchSize: config.batching.maxBatchSize,
			maxWaitTime: config.batching.maxWaitTime,
			debounceTime: config.batching.debounceTime,
		});

		return await batchTracker.addEvent(eventData);
	}

	// Fall back to single event tracking
	let sessionId = getValidSessionId(config.campaignId);

	if (!sessionId) {
		log("No valid session ID found, initializing new session");
		const initResult = await initializeSession();
		if (!initResult.success) {
			log("Failed to initialize session:", initResult.error);
			return false;
		}
		sessionId = initResult.data!.session_id;
	}

	// Attempt to track event
	const requestPayload = {
		session_id: sessionId,
		...eventData,
		page_url: eventData.page_url || window.location.href,
		referrer_url: eventData.referrer_url || document.referrer || undefined,
	};

	log("🚀 Sending event to API:", {
		event_id: requestPayload.event_id,
		event_type: requestPayload.event_type,
		session_id: requestPayload.session_id,
		url: `${config.apiUrl}/client-api/v1/events/track`,
	});

	const response = await fetch(`${config.apiUrl}/client-api/v1/events/track`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(requestPayload),
		credentials: "include",
	});

	const result: TrackEventResponse = await response.json();

	// Handle session renewal
	if (!result.success && result.new_session_id) {
		log("Session expired, renewing session");

		// Renew session with provided session ID (this will set new cookie!)
		const renewalResult = await renewSession(sessionId, result.new_session_id);

		if (renewalResult.success) {
			log("Session renewed successfully, retrying event tracking");
			// Session cookie is now updated by server
			// Tracking token is already stored by renewSession function
			// Retry tracking with new session - recursive call but only once
			return await trackEventOnce(
				{
					...eventData,
					page_url: eventData.page_url || window.location.href,
					referrer_url:
						eventData.referrer_url || document.referrer || undefined,
				},
				result.new_session_id,
			);
		}

		log("Session renewal failed:", renewalResult.error);
		return false;
	}

	if (result.success) {
		log("Event tracked successfully:", result.data);
		return true;
	}

	log("Event tracking failed:", result.error);
	return false;
}

/**
 * Track event once without retry logic (used internally after session renewal)
 */
async function trackEventOnce(
	eventData: TrackEventParams,
	sessionId: string,
): Promise<boolean> {
	const config = getConfig();

	const response = await fetch(`${config.apiUrl}/client-api/v1/events/track`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ session_id: sessionId, ...eventData }),
		credentials: "include",
	});

	const result: TrackEventResponse = await response.json();

	if (result.success) {
		log("Event tracked successfully on retry:", result.data);
		return true;
	}

	log("Event tracking failed on retry:", result.error);
	return false;
}

/**
 * Initialize session DO without setting client-side cookie (preserves server cookie)
 */
async function initializeSessionWithoutCookie(
	sessionId: string,
): Promise<SessionInitResponse> {
	const config = getConfig();

	const userId = getUserId(config.campaignId);
	const attribution = getAttributionData(config.campaignId);
	const abTest = getAbTestData(config.campaignId);

	// For session renewal, if cookies are missing, let the server handle it
	// The server can generate new user ID and attribution if needed
	if (!userId && !attribution) {
		log(
			"Warning: Both user ID and attribution cookies are missing, server will create new ones",
		);
	} else if (!userId) {
		log("Warning: User ID cookie is missing, server will create new one");
	} else if (!attribution) {
		log("Warning: Attribution cookie is missing, server will create new one");
	}

	const sessionData = {
		session_id: sessionId,
		campaign_id: config.campaignId,
		workspace_id: config.workspaceId,
		project_id: config.projectId,
		landing_page_id: config.landingPageId,
		user_id: userId || undefined, // Let server generate if missing
		attribution_id: attribution?.attributionId || undefined, // Let server generate if missing
		ab_test_id: abTest?.testId,
		ab_test_variant_id: abTest?.variantId,
		session_timeout_minutes: config.sessionTimeoutMinutes || 30,
	};

	log("Initializing DO session without cookie override:", sessionData);

	const response = await fetch(
		`${config.apiUrl}/client-api/v1/events/session/init`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(sessionData),
			credentials: "include", // Include cookies for server to set session cookie
		},
	);

	const result = await response.json();

	// Store tracking token if provided, but DON'T set session cookie
	if (result.success && result.data?.tracking_token) {
		setTrackingToken(result.data.tracking_token);
	}

	log("DO session init result (no cookie override):", result);

	return result;
}

/**
 * Initialize analytics session on page load
 */
export async function initializeAnalytics(): Promise<boolean> {
	const config = getConfig();
	const validSessionId = getValidSessionId(config.campaignId);

	if (validSessionId) {
		log(
			"Valid session found, initializing DO without overriding cookie:",
			validSessionId,
		);
		// Call API to ensure DO is initialized, but don't set client-side cookie to preserve server duration
		const result = await initializeSessionWithoutCookie(validSessionId);
		return result.success;
	}

	// Check for expired session ID - we want to initialize DO with it for renewal
	const expiredSessionId = getSessionId(config.campaignId);
	if (expiredSessionId) {
		log(
			"Expired session found, initializing server for potential renewal:",
			expiredSessionId,
		);
		// Try to initialize with expired session ID - server will handle renewal if needed
		const result = await initializeSession(expiredSessionId);
		return result.success;
	}

	log("No session found, initializing completely new session");
	const result = await initializeSession();
	return result.success;
}
