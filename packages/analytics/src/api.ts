import { getBatchTracker } from "./batch-tracker";
import SessionManager from "./session-manager";
import type {
	ConsentState,
	FirebuzzSessionContext,
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
	workspaceId: string;
	projectId: string;
	landingPageId?: string; // Can be undefined
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
let currentSessionData: {
	userId: string;
	sessionId: string;
	campaignId: string;
	segmentId?: string | null;
} | null = null;
let globalSessionManager: SessionManager | null = null;

export function configureApiClient(config: ApiClientConfig) {
	globalConfig = config;

	// Initialize session manager
	if (typeof window !== "undefined") {
		const environment = detectCampaignEnvironmentFromHostname(
			window.location.hostname,
		);
		globalSessionManager = new SessionManager({
			campaignId: config.campaignId,
			apiUrl: config.apiUrl,
			environment: environment === "production" ? "production" : "preview",
			debug: config.debug,
		});
	}
}

/**
 * Get the global session manager instance
 */
export function getSessionManager(): SessionManager | null {
	return globalSessionManager;
}

/**
 * Update session manager with consent state
 */
export function updateSessionConsent(consentState: ConsentState): void {
	if (globalSessionManager) {
		globalSessionManager.updateConsentState(consentState);
	}
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
export function setSessionData(sessionData: {
	userId: string;
	sessionId: string;
	campaignId: string;
	segmentId?: string | null;
}) {
	currentSessionData = sessionData;
	if (globalConfig?.debug) {
		console.log("[Analytics] Session data set:", sessionData);
	}
}

/**
 * Get current session data - now uses SessionManager
 */
export function getSessionData() {
	// First try session manager (preferred)
	if (globalSessionManager) {
		const sessionData = globalSessionManager.getCurrentSession();
		// If session manager returns null (no cookies allowed), fall back to legacy session data
		if (sessionData) {
			return sessionData;
		}
	}

	// Fallback to legacy session data
	return currentSessionData;
}

/**
 * Get current click ID for external link enhancement
 */
export function getTrackingToken(): string | null {
	return currentClickId;
}

// ============================================================================
// Session Tracking Functions
// ============================================================================

/**
 * Track session to analytics backend (Tinybird)
 * This replaces the server-side session tracking to ensure proper client context
 */
async function trackSession(
	sessionId: string,
	_userId: string,
	isRenewal = false,
): Promise<boolean> {
	const config = getConfig();
	if (!config) {
		log("No analytics config available for session tracking");
		return false;
	}

	try {
		// Get complete client-side context
		const _sessionData = getSessionData();
		const currentHostname =
			typeof window !== "undefined" ? window.location.hostname : "";
		// Get basic session context (no geo/device data needed - comes from server)
		const sessionContext: FirebuzzSessionContext | null =
			typeof window !== "undefined"
				? window.__FIREBUZZ_SESSION_CONTEXT__ || null
				: null;

		// Use session context environment if available, otherwise detect from hostname
		const currentCampaignEnvironment =
			sessionContext?.campaignEnvironment ||
			detectCampaignEnvironmentFromHostname(currentHostname);

		// Extract UTM parameters from current URL
		const urlParams = new URLSearchParams(window.location.search);
		const utm = {
			source: urlParams.get("utm_source"),
			medium: urlParams.get("utm_medium"),
			campaign: urlParams.get("utm_campaign"),
			term: urlParams.get("utm_term"),
			content: urlParams.get("utm_content"),
		};

		// Get referrer information
		const referrer =
			typeof document !== "undefined" ? document.referrer || null : null;
		const userAgent =
			typeof navigator !== "undefined" ? navigator.userAgent : "";
		const language =
			typeof navigator !== "undefined" ? navigator.language : "en-US";

		// Extract ref and source parameters from URL
		const ref = urlParams.get("ref");
		const source = urlParams.get("source");

		// Enhanced client-side detection
		const isMobile =
			typeof window !== "undefined"
				? /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
						userAgent,
					)
				: false;
		const isSSL =
			typeof window !== "undefined"
				? window.location.protocol === "https:"
				: true;

		// Device OS detection
		let deviceOS = "";
		let browser = "";
		let browserVersion = "";

		if (typeof navigator !== "undefined") {
			// OS detection
			if (userAgent.includes("Windows")) deviceOS = "Windows";
			else if (userAgent.includes("Mac")) deviceOS = "macOS";
			else if (userAgent.includes("Linux")) deviceOS = "Linux";
			else if (userAgent.includes("Android")) deviceOS = "Android";
			else if (userAgent.includes("iPhone") || userAgent.includes("iPad"))
				deviceOS = "iOS";
			else deviceOS = "Unknown";

			// Browser detection
			if (userAgent.includes("Chrome") && !userAgent.includes("Edge")) {
				browser = "Chrome";
				const match = userAgent.match(/Chrome\/(\d+)/);
				browserVersion = match?.[1] || "";
			} else if (userAgent.includes("Firefox")) {
				browser = "Firefox";
				const match = userAgent.match(/Firefox\/(\d+)/);
				browserVersion = match?.[1] || "";
			} else if (
				userAgent.includes("Safari") &&
				!userAgent.includes("Chrome")
			) {
				browser = "Safari";
				const match = userAgent.match(/Version\/(\d+)/);
				browserVersion = match?.[1] || "";
			} else if (userAgent.includes("Edge")) {
				browser = "Edge";
				const match = userAgent.match(/Edge\/(\d+)/);
				browserVersion = match?.[1] || "";
			} else {
				browser = "Unknown";
			}
		}

		// Get actual timezone
		const timezone =
			typeof Intl !== "undefined"
				? Intl.DateTimeFormat().resolvedOptions().timeZone
				: "UTC";

		// Get current URI
		const uri = typeof window !== "undefined" ? window.location.pathname : "";

		// Session context should always exist - if not, we can't track
		if (!sessionContext) {
			log("❌ No session context available for tracking - skipping");
			return false;
		}

		const trackingData = {
			timestamp: new Date().toISOString(),
			session_id: sessionId,
			user_id: sessionContext.userId,
			project_id: sessionContext.projectId,
			workspace_id: sessionContext.workspaceId,
			campaign_id: sessionContext.campaignId,
			landing_page_id: sessionContext.landingPageId,
			segment_id: sessionContext.segmentId || null, // FIXED: Added missing segmentId
			// AB test data from session context
			ab_test_id: sessionContext.abTestId || null,
			ab_test_variant_id: sessionContext.abTestVariantId || null,
			// UTM parameters
			utm_source: utm.source,
			utm_medium: utm.medium,
			utm_campaign: utm.campaign,
			utm_term: utm.term,
			utm_content: utm.content,
			// Ref and source parameters
			ref: ref,
			source: source,
			// Traffic data
			referrer: referrer,
			user_agent: userAgent,
			language: language,
			// Device data (client-side detection)
			device_os: deviceOS,
			browser: browser,
			browser_version: browserVersion,
			is_mobile: isMobile ? 1 : 0,
			connection_type: "unknown",
			// Geographic data (will be populated server-side by engine)
			country: "Unknown", // Server will override with Cloudflare data
			city: "Unknown", // Server will override with Cloudflare data
			region: "Unknown", // Server will override with Cloudflare data
			region_code: null, // Server will override with Cloudflare data
			continent: "Unknown", // Server will override with Cloudflare data
			timezone: timezone,
			is_eu_country: 0, // Server will override with Cloudflare data
			// Bot detection (from initial page load context)
			bot_score: sessionContext?.botDetection?.score || null,
			is_corporate_proxy: sessionContext?.botDetection?.corporateProxy ? 1 : 0,
			is_verified_bot: sessionContext?.botDetection?.verifiedBot ? 1 : 0,
			// Environment data
			user_hostname: currentHostname,
			campaign_environment: currentCampaignEnvironment,
			domain_type: "custom", // Server will override with correct domain type
			is_ssl: isSSL ? 1 : 0,
			uri: uri,
			// Session type
			is_renewal: isRenewal ? 1 : 0,
		};

		// Send to analytics tracking endpoint
		const response = await fetch(
			`${config.apiUrl}/client-api/v1/events/session/track`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(trackingData),
				credentials: "include",
			},
		);

		if (response.ok) {
			log(
				isRenewal
					? "Session renewal tracked successfully"
					: "New session tracked successfully",
			);
			return true;
		}
		log("Failed to track session:", response.status);
		return false;
	} catch (error) {
		console.error("Session tracking error:", error);
		return false;
	}
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
// API Methods
// ============================================================================

/**
 * Initialize a new session
 */
async function initializeSession(
	sessionId?: string,
): Promise<SessionInitResponse> {
	const config = getConfig();

	// Get session context to check for existing session ID
	const sessionContext: FirebuzzSessionContext | null =
		typeof window !== "undefined"
			? window.__FIREBUZZ_SESSION_CONTEXT__ || null
			: null;

	// Prioritize: provided sessionId > session context sessionId > generate new
	const session_id =
		sessionId || sessionContext?.session?.sessionId || generateUniqueId();

	// User ID MUST come from session context
	const userId = sessionContext?.userId;

	if (!userId) {
		log(
			"Error: No user ID available from session context - cannot initialize session",
		);
		return { success: false, error: "Missing session context data" };
	}

	// sessionContext already declared above for session ID lookup

	const currentHostname =
		typeof window !== "undefined" ? window.location.hostname : "";

	// Session context should always exist in preview/production - if not, we're in dev
	if (!sessionContext) {
		throw new Error(
			"[Analytics] Session context not found - analytics disabled in dev environment",
		);
	}

	const sessionInitData = {
		session_id,
		campaign_id: sessionContext.campaignId,
		workspace_id: sessionContext.workspaceId,
		project_id: sessionContext.projectId,
		landing_page_id: sessionContext.landingPageId,
		segment_id: sessionContext.segmentId || undefined,
		user_id: sessionContext.userId,
		// Include AB test data from session context
		ab_test_id: sessionContext.abTestId || undefined,
		ab_test_variant_id: sessionContext.abTestVariantId || undefined,
		session_timeout_minutes: config.sessionTimeoutMinutes || 30,
		campaign_environment: sessionContext.campaignEnvironment,
		is_ephemeral: !globalSessionManager?.shouldSetCookies(), // GDPR compliance flag
	};

	// Debug logging for the session init data
	if (config.debug) {
		console.log("[Analytics] Session init data from context:", {
			...sessionInitData,
			hostname: currentHostname,
		});
	}

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

	// Only create session cookie if consent allows (handled by SessionManager)
	if (result.success && result.data?.session_id) {
		// Session cookies are now handled by SessionManager based on consent
		// This ensures GDPR compliance and proper ephemeral/persistent mode switching
		if (globalSessionManager) {
			// Get session context for AB test data
			const sessionContext: FirebuzzSessionContext | null =
				typeof window !== "undefined"
					? window.__FIREBUZZ_SESSION_CONTEXT__ || null
					: null;

			// Let SessionManager handle cookie setting based on consent state
			const sessionDurationMinutes =
				result.data?.session_duration_minutes ||
				config.sessionTimeoutMinutes ||
				30;
			const sessionData = {
				userId: result.data.user_id || userId,
				sessionId: result.data.session_id,
				expiresAt: Date.now() + sessionDurationMinutes * 60 * 1000,
				createdAt: Date.now(),
				campaignId: config.campaignId,
				landingPageId: config.landingPageId,
				segmentId: sessionContext?.segmentId || null,
				// Use server response first, fall back to session context
				abTestId: result.data.ab_test_id || sessionContext?.abTestId || null,
				abTestVariantId:
					result.data.ab_test_variant_id ||
					sessionContext?.abTestVariantId ||
					null,
			};

			// SessionManager will only set cookies if consent allows
			if (globalSessionManager.shouldSetCookies()) {
				globalSessionManager.setSessionCookie(sessionData);
				globalSessionManager.setUserIdCookie(sessionData.userId);
				log("✅ Session cookies set via SessionManager (consent given)");
			} else {
				log("✅ Session initialized in ephemeral mode (no consent/cookies)");
			}
		}
	}

	// Debug: Check what cookies are actually available after API call
	log("Debug - Cookies after API call:", document.cookie);

	return result;
}

// Track in-flight renewal to prevent duplicates
let pendingRenewal: Promise<SessionRenewalResponse> | null = null;

/**
 * Extract current UTM parameters from URL
 */
function extractCurrentUTM() {
	if (typeof window === "undefined") return {};

	const urlParams = new URLSearchParams(window.location.search);
	return {
		utm_source: urlParams.get("utm_source") || undefined,
		utm_medium: urlParams.get("utm_medium") || undefined,
		utm_campaign: urlParams.get("utm_campaign") || undefined,
		utm_term: urlParams.get("utm_term") || undefined,
		utm_content: urlParams.get("utm_content") || undefined,
		ref: urlParams.get("ref") || undefined,
		source: urlParams.get("source") || undefined,
	};
}

/**
 * Renew session with attribution preservation
 */
async function renewSessionWithPreservation(oldSessionId: string): Promise<{
	success: boolean;
	sessionData?: {
		userId: string;
		sessionId: string;
		expiresAt: number;
		createdAt: number;
		campaignId: string;
		landingPageId?: string;
		segmentId?: string | null;
		abTestId?: string | null;
		abTestVariantId?: string | null;
	};
}> {
	const config = getConfig();
	const sessionContext = window.__FIREBUZZ_SESSION_CONTEXT__;
	if (!sessionContext) return { success: false };

	// Prepare renewal payload with preserved attribution data only
	const renewalPayload = {
		old_session_id: oldSessionId,
		user_id: sessionContext.userId, // Always from context
		campaign_id: sessionContext.campaignId,
		workspace_id: sessionContext.workspaceId,
		project_id: sessionContext.projectId,
		landing_page_id: sessionContext.landingPageId,
		segment_id: sessionContext.segmentId, // FIXED: Include segmentId

		// Send preserved attribution data (only what server can't detect)
		preserved_attribution: globalSessionManager?.getAttributionData(),
		current_url_utm: extractCurrentUTM(),
		current_referrer: document.referrer,

		// Include AB test data for preservation
		ab_test_id: sessionContext.abTestId,
		ab_test_variant_id: sessionContext.abTestVariantId,
	};

	const response = await fetch(
		`${config.apiUrl}/client-api/v1/events/session/renew`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(renewalPayload),
			credentials: globalSessionManager?.shouldSetCookies()
				? "include"
				: "omit",
		},
	);

	const result = await response.json();

	if (result.success) {
		// Server provides new session ID and expiration
		const renewedSession = {
			userId: sessionContext.userId, // Always from context
			sessionId: result.data.session_id, // Server-generated
			expiresAt: result.data.expires_at, // Server-provided
			createdAt: Date.now(), // Renewal timestamp
			campaignId: sessionContext.campaignId,
			landingPageId: sessionContext.landingPageId,
			segmentId: sessionContext.segmentId,
			abTestId: result.data.ab_test_id,
			abTestVariantId: result.data.ab_test_variant_id,
		};

		// Update session storage with renewal
		globalSessionManager?.updateAfterRenewal(renewedSession);

		return { success: true, sessionData: renewedSession };
	}

	return { success: false };
}

/**
 * Renew an expired session
 */
export async function renewSession(
	oldSessionId: string,
	newSessionId: string,
): Promise<SessionRenewalResponse> {
	// Prevent duplicate renewals for the same session
	if (pendingRenewal) {
		log("Session renewal already in progress, waiting for existing renewal...");
		return await pendingRenewal;
	}

	// Set the pending renewal promise
	pendingRenewal = performSessionRenewal(oldSessionId, newSessionId);

	try {
		const result = await pendingRenewal;
		return result;
	} finally {
		// Clear the pending renewal
		pendingRenewal = null;
	}
}

async function performSessionRenewal(
	oldSessionId: string,
	newSessionId: string,
): Promise<SessionRenewalResponse> {
	const config = getConfig();

	// Extract campaign slug from URL path (e.g., "/campaign-slug" -> "campaign-slug")
	// This is used by server to look up campaign config for session duration settings
	const campaignSlug =
		typeof window !== "undefined"
			? window.location.pathname.split("/").filter(Boolean)[0] || undefined
			: undefined;

	// Get session data from provider (no cookie reading)
	const sessionData = getSessionData();

	// Try to get existing user ID from session data or cookie
	let userId = sessionData?.userId;
	if (!userId && globalSessionManager) {
		userId = globalSessionManager.getUserIdCookie() || undefined;
	}

	// Always try to send existing user ID to prevent regeneration
	if (!userId) {
		log("Warning: No existing user ID found - this will create a new user");
	} else {
		log("Found existing user ID for renewal:", userId);
	}

	// Get session context for renewal
	const sessionContext: FirebuzzSessionContext | null =
		typeof window !== "undefined"
			? window.__FIREBUZZ_SESSION_CONTEXT__ || null
			: null;

	// Session context should always exist - if not, we can't renew
	if (!sessionContext) {
		return {
			success: false,
			error: "Session context not available for renewal",
		};
	}

	const renewalData = {
		new_session_id: newSessionId,
		campaign_id: sessionContext.campaignId,
		campaign_slug: campaignSlug, // Auto-detect from URL or use provided
		workspace_id: sessionContext.workspaceId,
		project_id: sessionContext.projectId,
		landing_page_id: sessionContext.landingPageId,
		session_timeout_minutes: config.sessionTimeoutMinutes || 30,
		user_id: sessionContext.userId,
		// Send original hostname for proper environment detection
		original_hostname:
			typeof window !== "undefined" ? window.location.hostname : undefined,
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

	// Handle session renewal cookies via SessionManager (GDPR compliant)
	if (result.success && result.data?.session_id) {
		if (globalSessionManager) {
			// Get current session data to preserve AB test assignments
			const currentSession = globalSessionManager.getCurrentSession();

			// Create session data for SessionManager
			const sessionData = {
				userId: result.data.user_id || userId || "",
				sessionId: result.data.session_id,
				expiresAt: Date.now() + 30 * 60 * 1000, // Default 30 min expiration
				createdAt: Date.now(),
				campaignId: config.campaignId,
				landingPageId: config.landingPageId,
				segmentId: currentSession?.segmentId || null,
				// Preserve existing AB test assignments or use server response
				abTestId: result.data.ab_test_id || currentSession?.abTestId || null,
				abTestVariantId:
					result.data.ab_test_variant_id ||
					currentSession?.abTestVariantId ||
					null,
			};

			// SessionManager will only set cookies if consent allows
			if (globalSessionManager.shouldSetCookies()) {
				globalSessionManager.setSessionCookie(sessionData);

				// Only set user cookie if we have a new one from server
				if (result.data.user_id) {
					globalSessionManager.setUserIdCookie(result.data.user_id);
				}

				log(
					"✅ Session renewal cookies set via SessionManager (consent given)",
				);
			} else {
				log("✅ Session renewed in ephemeral mode (no consent/cookies)");
			}
		}
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

	// Get session context for campaign environment
	const sessionContext: FirebuzzSessionContext | null =
		typeof window !== "undefined"
			? window.__FIREBUZZ_SESSION_CONTEXT__ || null
			: null;

	// Attempt to track event
	const requestPayload = {
		session_id: sessionId,
		...eventData,
		event_value_currency:
			eventData.event_value_currency || config.defaultCurrency || "USD",
		page_url: eventData.page_url || window.location.href,
		referrer_url: eventData.referrer_url || document.referrer || undefined,
		campaign_environment: sessionContext?.campaignEnvironment || "production",
		// Include AB test data from authoritative session context
		ab_test_id: sessionContext?.abTestId || undefined,
		ab_test_variant_id: sessionContext?.abTestVariantId || undefined,
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

	// Get session context for campaign environment and AB test fields
	const sessionContext: FirebuzzSessionContext | null =
		typeof window !== "undefined"
			? window.__FIREBUZZ_SESSION_CONTEXT__ || null
			: null;

	const response = await fetch(`${config.apiUrl}/client-api/v1/events/track`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			session_id: sessionId,
			...eventData,
			// Include AB test data on retry as well
			ab_test_id: sessionContext?.abTestId || undefined,
			ab_test_variant_id: sessionContext?.abTestVariantId || undefined,
			campaign_environment: sessionContext?.campaignEnvironment || "production",
		}),
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

// Prevent duplicate initializations
let isInitializing = false;
let initializationPromise: Promise<boolean> | null = null;

/**
 * Initialize analytics and create session using SessionManager
 */
export async function initializeAnalytics(): Promise<boolean> {
	// Return existing initialization if already in progress
	if (isInitializing && initializationPromise) {
		log("Analytics initialization already in progress, waiting...");
		return await initializationPromise;
	}

	const config = getConfig();
	if (!config) {
		log("Analytics not configured");
		return false;
	}

	if (!globalSessionManager) {
		log("SessionManager not initialized");
		return false;
	}

	// Set initialization lock
	isInitializing = true;
	initializationPromise = performInitialization();

	try {
		const result = await initializationPromise;
		return result;
	} finally {
		// Clear lock after completion
		isInitializing = false;
		initializationPromise = null;
	}
}

async function performInitialization(): Promise<boolean> {
	if (!globalSessionManager) return false;

	// 1. Load any persisted attribution data
	globalSessionManager.loadPersistedAttribution();

	// 2. Get current session from context (authoritative)
	const sessionData = globalSessionManager.getSessionFromContext();
	if (!sessionData) return false;

	// 3. Check if session is expired (local check)
	if (globalSessionManager.isSessionExpired(sessionData)) {
		// Session expired - trigger renewal
		const renewResult = await renewSessionWithPreservation(
			sessionData.sessionId,
		);
		if (!renewResult.success) return false;

		// Update currentSessionData with renewed session
		currentSessionData = renewResult.sessionData ?? null;

		// Track renewed session (always track renewals)
		if (currentSessionData) {
			await trackSession(
				currentSessionData.sessionId,
				currentSessionData.userId,
				true,
			);
			globalSessionManager.markSessionAsTracked(currentSessionData.sessionId);
		}
	} else {
		// Session valid - use as-is
		currentSessionData = {
			userId: sessionData.userId,
			sessionId: sessionData.sessionId,
			campaignId: sessionData.campaignId,
			segmentId: sessionData.segmentId,
		};

		// Initialize attribution if first time
		globalSessionManager.initializeAttribution(sessionData);

		// Only track if this session hasn't been tracked before
		if (!globalSessionManager.hasSessionBeenTracked(sessionData.sessionId)) {
			// Initialize EventTracker Durable Object for event processing
			const initResult = await globalSessionManager.initializeSession();
			if (!initResult.success) {
				log("❌ Failed to initialize EventTracker DO for session");
				return false;
			}

			// Track session to Tinybird analytics
			await trackSession(
				currentSessionData.sessionId,
				currentSessionData.userId,
				false,
			);
			globalSessionManager.markSessionAsTracked(sessionData.sessionId);
			log("✅ Session tracked to Tinybird");
		} else {
			log("♻️ Session already tracked, skipping duplicate tracking");
		}
	}

	return true;
}
