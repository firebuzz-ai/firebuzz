import Cookies from "js-cookie";
import type {
	AttributionData,
	ConsentState,
	FirebuzzSessionContext,
	SessionData,
	SessionInitResponse,
	SessionStorage,
} from "./types";
import { generateUniqueId } from "./utils/uuid";

// ============================================================================
// Configuration and Constants
// ============================================================================

const COOKIE_PREFIX = "frbzz_";

interface SessionManagerConfig {
	campaignId: string;
	apiUrl: string;
	environment: "dev" | "preview" | "production";
	debug?: boolean;
}

interface CookieOptions {
	domain?: string;
	secure: boolean;
	sameSite: "strict" | "lax" | "none";
	expires?: number; // Days
}

// ============================================================================
// Session Manager Class
// ============================================================================

export class SessionManager {
	private config: SessionManagerConfig;
	private consentState: ConsentState | null = null;
	private sessionStorage: SessionStorage | null = null; // NEW: Store attribution data

	constructor(config: SessionManagerConfig) {
		this.config = config;
	}

	// ============================================================================
	// Consent Integration
	// ============================================================================

	updateConsentState(consentState: ConsentState): void {
		const hadConsent = this.consentState?.preferences?.analytics === true;
		const hasConsent = consentState.preferences?.analytics === true;

		this.consentState = consentState;

		if (this.config.debug) {
			console.log("[SessionManager] Consent state updated:", consentState);
		}

		// Handle consent state changes
		this.onConsentChange(hadConsent, hasConsent);
	}

	/**
	 * React to consent changes - set or clear cookies accordingly
	 */
	private onConsentChange(hadConsent: boolean, hasConsent: boolean): void {
		if (!hadConsent && hasConsent) {
			// Consent granted - set cookies with current session data
			const currentSession = this.getSessionFromContext();
			if (currentSession) {
				this.setSessionCookies(currentSession);
			}
		} else if (hadConsent && !hasConsent) {
			// Consent revoked - clear cookies, maintain memory state
			this.clearAllCookies();
		}
	}

	/**
	 * Set all session-related cookies
	 */
	private setSessionCookies(sessionData: SessionData): void {
		if (!this.shouldSetCookies()) return;

		// Set session cookie with expiration from server
		this.setSessionCookie(sessionData);

		// Set user ID cookie (longer expiration)
		this.setUserIdCookie(sessionData.userId);

		// Set attribution cookie if available
		if (this.sessionStorage) {
			this.setAttributionCookie(this.sessionStorage);
		}
	}

	// ============================================================================
	// Cookie Name Generation
	// ============================================================================

	private getUserIdCookieName(): string {
		// In preview mode, scope user ID by campaign to prevent cross-customer collisions
		if (this.config.environment === "preview") {
			return `${COOKIE_PREFIX}uid_${this.config.campaignId}`;
		}
		return `${COOKIE_PREFIX}uid`;
	}

	private getSessionCookieName(): string {
		return `${COOKIE_PREFIX}session_${this.config.campaignId}`;
	}

	// ============================================================================
	// Environment Detection
	// ============================================================================

	public shouldSetCookies(): boolean {
		// Don't set cookies in dev environment
		if (this.config.environment === "dev") {
			return false;
		}

		// If no consent state available, don't set cookies (will use ephemeral tracking)
		if (!this.consentState) {
			return false;
		}

		// Get session context to check GDPR settings
		const sessionContext: FirebuzzSessionContext | null =
			typeof window !== "undefined"
				? window.__FIREBUZZ_SESSION_CONTEXT__ || null
				: null;

		// GDPR Compliance Logic:
		// 1. GDPR disabled: Always set cookies (US, etc.)
		// 2. GDPR enabled + consent given: Set cookies
		// 3. GDPR enabled + no consent: No cookies (ephemeral tracking only)

		// Check if consent is required based on GDPR settings
		const isConsentRequired =
			sessionContext?.gdprSettings?.isEnabled &&
			sessionContext?.gdprSettings?.isRequiredConsent;

		if (this.config.debug) {
			console.log("[SessionManager] shouldSetCookies debug:", {
				hasConsentState: !!this.consentState,
				isConsentRequired,
				gdprEnabled: sessionContext?.gdprSettings?.isEnabled,
				gdprRequiredConsent: sessionContext?.gdprSettings?.isRequiredConsent,
				hasUserInteracted: this.consentState?.hasUserInteracted,
				analyticsConsent: this.consentState?.preferences?.analytics,
			});
		}

		if (!isConsentRequired) {
			// GDPR disabled or consent not required - set cookies immediately
			if (this.config.debug) {
				console.log("[SessionManager] GDPR disabled - allowing cookies");
			}
			return true;
		}

		// GDPR enabled and consent required - only set cookies if user has interacted and explicitly granted
		const shouldAllow =
			this.consentState.hasUserInteracted &&
			this.consentState.preferences?.analytics === true;

		if (this.config.debug) {
			console.log(
				"[SessionManager] GDPR enabled - shouldSetCookies:",
				shouldAllow,
			);
		}

		return shouldAllow;
	}

	private getCookieOptions(expirationDays = 1): CookieOptions {
		return {
			secure: this.config.environment === "production",
			sameSite: this.config.environment === "production" ? "lax" : "lax",
			expires: expirationDays,
		};
	}

	// ============================================================================
	// User ID Cookie Management
	// ============================================================================

	setUserIdCookie(userId: string): void {
		if (!this.shouldSetCookies()) {
			if (this.config.debug) {
				console.log(
					"[SessionManager] Skipping user ID cookie - no consent or dev mode",
				);
			}
			return;
		}

		const cookieName = this.getUserIdCookieName();
		Cookies.set(cookieName, userId, this.getCookieOptions(365)); // 1 year

		if (this.config.debug) {
			console.log(`[SessionManager] User ID cookie set: ${cookieName}`);
		}
	}

	getUserIdCookie(): string | null {
		const cookieName = this.getUserIdCookieName();
		return Cookies.get(cookieName) || null;
	}

	removeUserIdCookie(): void {
		const cookieName = this.getUserIdCookieName();
		Cookies.remove(cookieName);

		if (this.config.debug) {
			console.log(`[SessionManager] User ID cookie removed: ${cookieName}`);
		}
	}

	// ============================================================================
	// Session Cookie Management
	// ============================================================================

	setSessionCookie(sessionData: SessionData): void {
		if (!this.shouldSetCookies()) {
			if (this.config.debug) {
				console.log(
					"[SessionManager] Skipping session cookie - no consent or dev mode",
				);
			}
			return;
		}

		const cookieName = this.getSessionCookieName();
		const cookieValue = JSON.stringify(sessionData);

		// Session cookies expire in 30 minutes
		const thirtyMinutesInDays = 30 / (24 * 60); // Convert to days
		Cookies.set(
			cookieName,
			cookieValue,
			this.getCookieOptions(thirtyMinutesInDays),
		);

		if (this.config.debug) {
			console.log(
				`[SessionManager] Session cookie set: ${cookieName}`,
				sessionData,
			);
		}
	}

	getSessionCookie(): SessionData | null {
		const cookieName = this.getSessionCookieName();
		const cookie = Cookies.get(cookieName);

		if (!cookie) return null;

		try {
			return JSON.parse(cookie) as SessionData;
		} catch (error) {
			if (this.config.debug) {
				console.warn("[SessionManager] Failed to parse session cookie:", error);
			}
			return null;
		}
	}

	removeSessionCookie(): void {
		const cookieName = this.getSessionCookieName();
		Cookies.remove(cookieName);

		if (this.config.debug) {
			console.log(`[SessionManager] Session cookie removed: ${cookieName}`);
		}
	}

	// ============================================================================
	// Session Expiration Validation
	// ============================================================================

	/**
	 * Check if a session is expired based on local expiration time
	 * No server calls - purely local validation
	 */
	isSessionExpired(session: SessionData): boolean {
		return Date.now() >= session.expiresAt;
	}

	/**
	 * Get session from context with authority
	 */
	getSessionFromContext(): SessionData | null {
		const sessionContext = this.getSessionContext();
		if (!sessionContext) return null;

		return {
			userId: sessionContext.userId, // NEVER generate
			sessionId: sessionContext.session.sessionId,
			expiresAt: sessionContext.session.expiresAt,
			createdAt: sessionContext.session.createdAt,
			campaignId: sessionContext.campaignId,
			landingPageId: sessionContext.landingPageId,
			segmentId: sessionContext.segmentId,
			abTestId: sessionContext.abTestId,
			abTestVariantId: sessionContext.abTestVariantId,
		};
	}

	/**
	 * Helper to get session context
	 */
	private getSessionContext(): FirebuzzSessionContext | null {
		return typeof window !== "undefined"
			? window.__FIREBUZZ_SESSION_CONTEXT__ || null
			: null;
	}

	// ============================================================================
	// Session Lifecycle Management
	// ============================================================================

	async initializeSession(): Promise<{
		sessionData: SessionData;
		success: boolean;
	}> {
		const canSetCookies = this.shouldSetCookies();

		// Get session context first - REQUIRED for user ID
		const sessionContext: FirebuzzSessionContext | null =
			typeof window !== "undefined"
				? window.__FIREBUZZ_SESSION_CONTEXT__ || null
				: null;

		if (!sessionContext) {
			console.error(
				"[SessionManager] Cannot initialize without session context",
			);
			return {
				sessionData: {} as SessionData,
				success: false,
			};
		}

		// Use existing session ID from context, only generate new one if none exists
		const sessionId = sessionContext.session?.sessionId || generateUniqueId();

		// User ID MUST come from session context (server-authoritative)
		const finalUserId = sessionContext.userId;

		// Create session data with AB test info from context
		const sessionData: SessionData = {
			userId: finalUserId, // ALWAYS from context
			sessionId,
			expiresAt:
				sessionContext.session?.expiresAt || Date.now() + 30 * 60 * 1000,
			createdAt: sessionContext.session?.createdAt || Date.now(),
			campaignId: sessionContext.campaignId,
			landingPageId: sessionContext.landingPageId || undefined,
			segmentId: sessionContext.segmentId || null,
			abTestId: sessionContext.abTestId || null,
			abTestVariantId: sessionContext.abTestVariantId || null,
		};

		try {
			// Call engine API to initialize session
			const response = await fetch(
				`${this.config.apiUrl}/client-api/v1/events/session/init`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						session_id: sessionId,
						user_id: finalUserId,
						campaign_id: this.config.campaignId,
						workspace_id: sessionContext?.workspaceId || "",
						project_id: sessionContext?.projectId || "",
						landing_page_id: sessionContext?.landingPageId || "",
						segment_id: sessionContext?.segmentId || undefined,
						session_timeout_minutes: 30,
						is_ephemeral: !canSetCookies, // Flag for server to know this is ephemeral
					}),
					credentials: "include",
				},
			);

			const result: SessionInitResponse = await response.json();

			if (result.success) {
				// Update session data with server response (may include AB test assignments)
				const finalSessionData: SessionData = {
					...sessionData,
					segmentId: sessionData.segmentId, // Keep segment_id from context
					abTestId: result.data?.ab_test_id || sessionData.abTestId,
					abTestVariantId:
						result.data?.ab_test_variant_id || sessionData.abTestVariantId,
				};

				// Only set cookies if consent allows
				if (canSetCookies) {
					this.setUserIdCookie(finalUserId);
					this.setSessionCookie(finalSessionData);
				}

				if (this.config.debug) {
					console.log("[SessionManager] Session initialized successfully:", {
						...finalSessionData,
						ephemeral: !canSetCookies,
					});
				}

				return { sessionData: finalSessionData, success: true };
			}
			console.error(
				"[SessionManager] Failed to initialize session:",
				result.error,
			);
			return { sessionData, success: false };
		} catch (error) {
			console.error("[SessionManager] Session initialization error:", error);
			return { sessionData, success: false };
		}
	}

	async validateSession(sessionId: string): Promise<boolean> {
		try {
			const response = await fetch(
				`${this.config.apiUrl}/client-api/v1/events/session/validate`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ session_id: sessionId }),
					credentials: "include",
				},
			);

			const result = await response.json();
			return result.valid === true;
		} catch (error) {
			if (this.config.debug) {
				console.error("[SessionManager] Session validation error:", error);
			}
			return false;
		}
	}

	// ============================================================================
	// Ephemeral Session Management (No Cookies)
	// ============================================================================

	/**
	 * Create ephemeral session data (no cookies set)
	 * NOTE: User ID must always come from session context
	 */
	createEphemeralSession(): SessionData | null {
		// Get session context for user ID and session data
		const sessionContext: FirebuzzSessionContext | null =
			typeof window !== "undefined"
				? window.__FIREBUZZ_SESSION_CONTEXT__ || null
				: null;

		if (!sessionContext) {
			return null; // Cannot create session without context
		}

		return {
			userId: sessionContext.userId, // ALWAYS from context, never generate
			sessionId: sessionContext.session?.sessionId || generateUniqueId(),
			expiresAt:
				sessionContext.session?.expiresAt || Date.now() + 30 * 60 * 1000,
			createdAt: sessionContext.session?.createdAt || Date.now(),
			campaignId: sessionContext.campaignId,
			landingPageId: sessionContext.landingPageId || undefined,
			segmentId: sessionContext.segmentId || null,
			abTestId: sessionContext.abTestId || null,
			abTestVariantId: sessionContext.abTestVariantId || null,
		};
	}

	// ============================================================================
	// Attribution Data Management
	// ============================================================================

	/**
	 * Extract current UTM parameters from URL
	 */
	private extractCurrentUTM() {
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
	 * Initialize attribution data for new session
	 */
	initializeAttribution(sessionData: SessionData): void {
		if (this.sessionStorage?.attribution) return; // Already initialized

		const currentUTM = this.extractCurrentUTM();
		this.sessionStorage = {
			attribution: {
				original: {
					timestamp: sessionData.createdAt,
					...currentUTM,
					referrer:
						typeof document !== "undefined"
							? document.referrer || undefined
							: undefined,
					landingPage:
						typeof window !== "undefined" ? window.location.pathname : "/",
				},
				current: currentUTM,
			},
			renewalCount: 0,
			originalSessionId: sessionData.sessionId,
			originalTimestamp: sessionData.createdAt,
		};

		// Persist if consent given
		if (this.shouldSetCookies()) {
			this.setAttributionCookie(this.sessionStorage);
		}
	}

	/**
	 * Load persisted attribution data
	 */
	loadPersistedAttribution(): void {
		if (this.shouldSetCookies()) {
			const persisted = this.getAttributionCookie();
			if (persisted) {
				this.sessionStorage = persisted;
			}
		}
	}

	/**
	 * Get attribution data for sending to server
	 */
	getAttributionData(): AttributionData | null {
		return this.sessionStorage?.attribution || null;
	}

	/**
	 * Update attribution after session renewal
	 */
	updateAfterRenewal(renewedSession: SessionData): void {
		if (this.sessionStorage) {
			this.sessionStorage.renewalCount++;
			// Update current attribution with latest UTM params
			this.sessionStorage.attribution.current = this.extractCurrentUTM();

			// Persist if consent given
			if (this.shouldSetCookies()) {
				this.setAttributionCookie(this.sessionStorage);
				this.setSessionCookie(renewedSession);
			}
		}
	}

	/**
	 * Check if session has been tracked to Tinybird
	 * Simple logic: if session cookie exists and matches, it means we've already tracked this session
	 */
	hasSessionBeenTracked(sessionId: string): boolean {
		// If cookies are not allowed, we can't persist tracking state, so always track
		if (!this.shouldSetCookies()) return false;

		// Get existing session cookie
		const existingSession = this.getSessionCookie();

		// If session cookie exists and matches current session ID, it's already been tracked
		return existingSession !== null && existingSession.sessionId === sessionId;
	}

	/**
	 * Mark session as tracked - this happens automatically when we set the session cookie
	 * No need for explicit tracking since cookie existence = already tracked
	 */
	markSessionAsTracked(sessionId: string): void {
		// This method is now just for API compatibility
		// The actual "marking" happens when setSessionCookie is called
		if (this.config.debug) {
			console.log(`[SessionManager] Session ${sessionId} marked as tracked`);
		}
	}

	/**
	 * Cookie management for attribution data
	 */
	private getAttributionCookieName(): string {
		return `${COOKIE_PREFIX}attr_${this.config.campaignId}`;
	}

	private setAttributionCookie(storage: SessionStorage): void {
		if (!this.shouldSetCookies()) return;

		const cookieName = this.getAttributionCookieName();
		const cookieValue = JSON.stringify(storage);

		// Attribution cookies expire in 30 days
		Cookies.set(cookieName, cookieValue, this.getCookieOptions(30));

		if (this.config.debug) {
			console.log(`[SessionManager] Attribution cookie set: ${cookieName}`);
		}
	}

	private getAttributionCookie(): SessionStorage | null {
		const cookieName = this.getAttributionCookieName();
		const cookie = Cookies.get(cookieName);

		if (!cookie) return null;

		try {
			return JSON.parse(cookie) as SessionStorage;
		} catch (error) {
			if (this.config.debug) {
				console.warn(
					"[SessionManager] Failed to parse attribution cookie:",
					error,
				);
			}
			return null;
		}
	}

	private removeAttributionCookie(): void {
		const cookieName = this.getAttributionCookieName();
		Cookies.remove(cookieName);

		if (this.config.debug) {
			console.log(`[SessionManager] Attribution cookie removed: ${cookieName}`);
		}
	}

	// ============================================================================
	// Session State Management
	// ============================================================================

	getCurrentSession(): SessionData | null {
		// 1. Always start with session context (authoritative)
		const contextSession = this.getSessionFromContext();
		if (!contextSession) return null;

		// 2. Check if session is expired
		if (this.isSessionExpired(contextSession)) {
			return null; // Force renewal
		}

		// 3. If cookies allowed, try to get persisted session for continuity
		if (this.shouldSetCookies()) {
			const persistedSession = this.getSessionCookie();
			if (persistedSession && !this.isSessionExpired(persistedSession)) {
				// Merge: use context user ID, persisted session if valid
				return {
					...persistedSession,
					userId: contextSession.userId, // Always prefer context
				};
			}
		}

		return contextSession;
	}

	// ============================================================================
	// Cleanup
	// ============================================================================

	clearAllCookies(): void {
		this.removeUserIdCookie();
		this.removeSessionCookie();
		this.removeAttributionCookie();

		if (this.config.debug) {
			console.log("[SessionManager] All cookies cleared");
		}
	}
}

// ============================================================================
// Default Export
// ============================================================================

export default SessionManager;
