import Cookies from "js-cookie";
import type {
	ConsentState,
	FirebuzzSessionContext,
	SessionData,
	SessionInitResponse,
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

	constructor(config: SessionManagerConfig) {
		this.config = config;
	}

	// ============================================================================
	// Consent Integration
	// ============================================================================

	updateConsentState(consentState: ConsentState): void {
		this.consentState = consentState;
		if (this.config.debug) {
			console.log("[SessionManager] Consent state updated:", consentState);
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

		// GDPR Compliance Logic:
		// 1. GDPR disabled: Always set cookies (US, etc.)
		// 2. GDPR enabled + consent given: Set cookies
		// 3. GDPR enabled + no consent: No cookies (ephemeral tracking only)

		// Check if consent is required based on hasUserInteracted flag
		const isConsentRequired =
			this.consentState.hasUserInteracted ||
			this.consentState.preferences.analytics !== false;

		if (!isConsentRequired) {
			// GDPR disabled or consent not required - set cookies immediately
			return true;
		}

		// GDPR enabled and consent required - only set cookies if explicitly granted
		return this.consentState.preferences?.analytics === true;
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
	// Session Lifecycle Management
	// ============================================================================

	async initializeSession(
		userId?: string,
	): Promise<{ sessionData: SessionData; success: boolean }> {
		const sessionId = generateUniqueId();
		const canSetCookies = this.shouldSetCookies();

		// Determine user ID based on consent and cookies
		let finalUserId: string;
		if (canSetCookies) {
			// Cookies allowed - use persistent user ID
			finalUserId = userId || this.getUserIdCookie() || generateUniqueId();
		} else {
			// No cookies - use ephemeral user ID
			finalUserId = this.getEphemeralUserId();
		}

		// Get AB test data from session context (window global)
		const sessionContext: FirebuzzSessionContext | null =
			typeof window !== "undefined"
				? window.__FIREBUZZ_SESSION_CONTEXT__ || null
				: null;

		// Create session data with AB test info from context
		const sessionData: SessionData = {
			userId: finalUserId,
			sessionId,
			campaignId: sessionContext?.campaignId || this.config.campaignId,
			landingPageId: sessionContext?.landingPageId || undefined,
			abTestId: sessionContext?.abTestId || null,
			abTestVariantId: sessionContext?.abTestVariantId || null,
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
	 * Get ephemeral user ID based on daily salt (24h expiry)
	 * This is used when no consent for cookies but analytics is allowed
	 */
	getEphemeralUserId(): string {
		// Generate daily salt-based user ID using browser fingerprinting
		const today = new Date().toISOString().split("T")[0];
		const userAgent =
			typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
		const language =
			typeof navigator !== "undefined" ? navigator.language : "en-US";
		const timezone =
			typeof Intl !== "undefined"
				? Intl.DateTimeFormat().resolvedOptions().timeZone
				: "UTC";
		const screenInfo =
			typeof screen !== "undefined"
				? `${screen.width}x${screen.height}`
				: "unknown";

		// Combine daily salt with stable browser characteristics
		const fingerprint = `salt-${today}-${this.config.campaignId}-${userAgent}-${language}-${timezone}-${screenInfo}`;

		// Generate hash (simple hash function for client-side)
		let hash = 0;
		for (let i = 0; i < fingerprint.length; i++) {
			const char = fingerprint.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}

		return `ephemeral_${Math.abs(hash).toString(36)}`;
	}

	/**
	 * Create ephemeral session data (no cookies set)
	 */
	createEphemeralSession(): SessionData {
		// Get AB test data from session context even in ephemeral mode
		const sessionContext: FirebuzzSessionContext | null =
			typeof window !== "undefined"
				? window.__FIREBUZZ_SESSION_CONTEXT__ || null
				: null;

		return {
			userId: this.getEphemeralUserId(),
			sessionId: generateUniqueId(),
			campaignId: sessionContext?.campaignId || this.config.campaignId,
			landingPageId: sessionContext?.landingPageId || undefined,
			abTestId: sessionContext?.abTestId || null,
			abTestVariantId: sessionContext?.abTestVariantId || null,
		};
	}

	// ============================================================================
	// Session State Management
	// ============================================================================

	getCurrentSession(): SessionData | null {
		// First try to get from cookie (if cookies are allowed)
		if (this.shouldSetCookies()) {
			const sessionData = this.getSessionCookie();

			// If no cookie session, try to get user ID at least
			if (!sessionData) {
				const userId = this.getUserIdCookie();
				if (userId) {
					// Return minimal session data with existing user ID
					return {
						userId,
						sessionId: generateUniqueId(), // Generate temporary session ID
						campaignId: this.config.campaignId,
						landingPageId: undefined,
						abTestId: null,
						abTestVariantId: null,
					};
				}
			}

			return sessionData;
		}
		// Cookies not allowed - use ephemeral session
		return this.createEphemeralSession();
	}

	// ============================================================================
	// Cleanup
	// ============================================================================

	clearAllCookies(): void {
		this.removeUserIdCookie();
		this.removeSessionCookie();

		if (this.config.debug) {
			console.log("[SessionManager] All cookies cleared");
		}
	}
}

// ============================================================================
// Default Export
// ============================================================================

export default SessionManager;
