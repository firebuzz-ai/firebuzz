import { getBatchTracker } from "./batch-tracker";
import type {
	SessionInitResponse,
	SessionRenewalResponse,
	TrackEventParams,
	TrackEventResponse,
} from "./types";
import { generateUniqueId } from "./utils/uuid";

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
	defaultCurrency?: string; // Default currency for events
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
let currentClickId: string | null = null;
let currentSessionData: { userId: string; sessionId: string; campaignId: string } | null = null;

export function configureApiClient(config: ApiClientConfig) {
	globalConfig = config;
}

/**
 * Store click ID received from session init/renewal (short token system)
 */
export function setTrackingToken(clickId: string | undefined) {
	currentClickId = clickId || null;
	if (globalConfig?.debug && clickId) {
		console.log("[Analytics] Click ID stored");
	}
}

/**
 * Set session data from analytics provider
 */
export function setSessionData(sessionData: { userId: string; sessionId: string; campaignId: string }) {
	currentSessionData = sessionData;
	if (globalConfig?.debug) {
		console.log("[Analytics] Session data set:", sessionData);
	}
}

/**
 * Get current session data
 */
export function getSessionData() {
	return currentSessionData;
}

/**
 * Get current click ID for external link enhancement
 */
export function getTrackingToken(): string | null {
	return currentClickId;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detect campaign environment from hostname (client-side detection)
 * This matches the server-side logic in detectCampaignEnvironment()
 */
function detectCampaignEnvironmentFromHostname(
	hostname: string,
): "preview" | "production" {
	const normalizedHostname = hostname.toLowerCase();

	// Check for preview URL patterns (matching server-side logic)
	const previewPatterns = [
		/^preview\.frbzz\.com$/,
		/^preview-dev\.frbzz\.com$/,
		/^preview-preview\.frbzz\.com$/,
	];

	for (const pattern of previewPatterns) {
		if (pattern.test(normalizedHostname)) {
			return "preview";
		}
	}

	// Default to production for all other hostnames
	return "production";
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
// Session Context Storage
// ============================================================================

interface StoredSessionContext {
	landingPageId: string;
	abTestId: string | null;
	abTestVariantId: string | null;
	utm: {
		source?: string;
		medium?: string;
		campaign?: string;
		term?: string;
		content?: string;
	};
	geo: {
		country: string | null;
		city: string | null;
		region: string | null;
		regionCode: string | null;
		continent: string | null;
		latitude: string | null;
		longitude: string | null;
		postalCode: string | null;
		timezone: string | null;
		isEUCountry: boolean;
	};
	device: {
		type: string;
		os: string;
		browser: string;
		browserVersion: string | null;
		isMobile: boolean;
		connectionType: string;
	};
	traffic: {
		referrer: string | null;
		userAgent: string;
	};
	localization: {
		language: string | null;
		languages: string[];
	};
	bot: {
		corporateProxy: boolean;
		verifiedBot: boolean;
		score: number;
	} | null;
	network: {
		ip: string | null;
		isSSL: boolean;
		domainType: string | null;
		userHostname: string | null;
	};
	session: {
		isReturning: boolean;
		campaignEnvironment: string;
		environment: string | null;
		uri: string | null;
		fullUri: string | null;
	};
}

/**
 * Store session context from server-injected global variable
 */
function storeSessionContext(campaignId: string): boolean {
	try {
		// Check if we're in a browser
		if (typeof window === "undefined" || typeof localStorage === "undefined") {
			return false;
		}

		// Check for server-injected session context
		// The server will inject this via a script tag: window.__FIREBUZZ_SESSION_CONTEXT__
		const globalContext = (
			window as { __FIREBUZZ_SESSION_CONTEXT__?: StoredSessionContext }
		).__FIREBUZZ_SESSION_CONTEXT__;

		if (!globalContext) {
			log("No session context found from server");
			return false;
		}

		const sessionContext: StoredSessionContext = globalContext;

		// Store in localStorage
		localStorage.setItem(
			`firebuzz_session_context_${campaignId}`,
			JSON.stringify(sessionContext),
		);
		log("Session context stored successfully", sessionContext);

		// Clean up global variable
		(
			window as { __FIREBUZZ_SESSION_CONTEXT__?: StoredSessionContext }
		).__FIREBUZZ_SESSION_CONTEXT__ = undefined;

		return true;
	} catch (error) {
		log("Failed to store session context:", error);
		return false;
	}
}

/**
 * Get stored session context from localStorage
 */
function getStoredSessionContext(
	campaignId: string,
): StoredSessionContext | null {
	try {
		if (typeof localStorage === "undefined") {
			return null;
		}

		const stored = localStorage.getItem(
			`firebuzz_session_context_${campaignId}`,
		);
		if (!stored) {
			log("No stored session context found");
			return null;
		}

		const context = JSON.parse(stored) as StoredSessionContext;
		log("Retrieved stored session context", context);
		return context;
	} catch (error) {
		log("Failed to retrieve stored session context:", error);
		return null;
	}
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

	// Get session data from provider (no cookie reading)
	const sessionData = getSessionData();
	const userId = sessionData?.userId || generateUniqueId();

	if (!sessionData) {
		log("Warning: No session data available, using temporary ID");
	}

	// Detect campaign environment from current page domain (where user actually is)
	const currentHostname =
		typeof window !== "undefined" ? window.location.hostname : "";
	const currentCampaignEnvironment =
		detectCampaignEnvironmentFromHostname(currentHostname);

	const sessionInitData = {
		session_id,
		campaign_id: config.campaignId,
		workspace_id: config.workspaceId,
		project_id: config.projectId,
		landing_page_id: config.landingPageId,
		user_id: userId,
		// Attribution removed completely
		// A/B test data removed (will be handled by session context)
		session_timeout_minutes: config.sessionTimeoutMinutes || 30,
		campaign_environment: currentCampaignEnvironment, // Send detected environment
	};

	log("Initializing session:", sessionInitData);

	let response: Response;
	let result: SessionInitResponse;

	try {
		response = await fetch(
			`${config.apiUrl}/client-api/v1/events/session/init`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(sessionInitData),
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
	if (result.success && result.data?.click_id) {
		setTrackingToken(result.data.click_id);
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

	// Get session data from provider (no cookie reading)
	const sessionData = getSessionData();

	const renewalData = {
		new_session_id: newSessionId,
		campaign_id: config.campaignId,
		campaign_slug: campaignSlug, // Auto-detect from URL or use provided
		workspace_id: config.workspaceId,
		project_id: config.projectId,
		landing_page_id: config.landingPageId,
		session_timeout_minutes: config.sessionTimeoutMinutes || 30,
		user_id: sessionData?.userId,
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

	// Store new click ID if provided
	if (result.success && result.data?.click_id) {
		setTrackingToken(result.data.click_id);
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

		// Determine if this is a preview environment by checking domain
		const isPreview =
			typeof window !== "undefined" &&
			(window.location.hostname.includes("preview") ||
				window.location.hostname.includes("engine-dev"));

		// 1. Always set session cookie (this expires and triggers renewal)
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

		// 2. Only set user cookie if it doesn't exist or if server provided new one
		if (result.data.user_id) {
			// Use correct cookie naming: preview uses campaign prefix, production doesn't
			const userCookieName = isPreview
				? `frbzz_uid_${config.campaignId}`
				: "frbzz_uid";

			// Check if user cookie already exists and is valid
			const existingUserCookie = Cookies.get(userCookieName);

			if (!existingUserCookie) {
				// Only set if missing
				const userCookie = {
					userId: result.data.user_id,
					createdAt: Date.now(),
				};

				Cookies.set(userCookieName, JSON.stringify(userCookie), {
					expires: 400, // 400 days
					secure: true,
					sameSite: "Lax",
					path: "/",
				});

				log("✅ User cookie set (was missing):", result.data.user_id);
			} else {
				log("✅ User cookie already exists, not overwriting");
			}
		}

		// Attribution logic completely removed

		log(
			"✅ Session renewal complete with duration:",
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
	const sessionData = getSessionData();
	let sessionId = sessionData?.sessionId;

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
		event_value_currency:
			eventData.event_value_currency || config.defaultCurrency || "USD",
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

	// Get session data from provider (no cookie reading)
	const sessionData = getSessionData();
	const userId = sessionData?.userId || generateUniqueId();

	if (!sessionData) {
		log("Warning: No session data available, using temporary ID");
	}

	// Detect campaign environment from current page domain
	const currentHostname =
		typeof window !== "undefined" ? window.location.hostname : "";
	const currentCampaignEnvironment =
		detectCampaignEnvironmentFromHostname(currentHostname);

	const sessionRenewalData = {
		session_id: sessionId,
		campaign_id: config.campaignId,
		workspace_id: config.workspaceId,
		project_id: config.projectId,
		landing_page_id: config.landingPageId,
		user_id: userId,
		// Attribution removed completely
		// A/B test data removed (will be handled by session context)
		session_timeout_minutes: config.sessionTimeoutMinutes || 30,
		campaign_environment: currentCampaignEnvironment, // Send detected environment
	};

	log("Initializing DO session without cookie override:", sessionRenewalData);

	const response = await fetch(
		`${config.apiUrl}/client-api/v1/events/session/init`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(sessionRenewalData),
			credentials: "include", // Include cookies for server to set session cookie
		},
	);

	const result = await response.json();

	// Store tracking token if provided, but DON'T set session cookie
	if (result.success && result.data?.click_id) {
		setTrackingToken(result.data.click_id);
	}

	log("DO session init result (no cookie override):", result);

	return result;
}

/**
 * Initialize analytics session on page load
 */
export async function initializeAnalytics(): Promise<boolean> {
	const config = getConfig();

	// Try to store session context from server (only works on new sessions/page loads)
	storeSessionContext(config.campaignId);

	// Get session data from provider (no cookie reading)
	const sessionData = getSessionData();
	
	if (sessionData?.sessionId) {
		log(
			"Valid session found from provider, initializing DO:",
			sessionData.sessionId,
		);
		// Call API to ensure DO is initialized
		const result = await initializeSessionWithoutCookie(sessionData.sessionId);
		return result.success;
	}

	log("No session found, initializing completely new session");
	const result = await initializeSession();
	return result.success;
}
