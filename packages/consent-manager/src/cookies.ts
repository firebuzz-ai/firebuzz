import Cookies from "js-cookie";
import type { ConsentState, ConsentPreferences, SessionContext } from "./types";
import { COOKIE_NAMES, DEFAULT_COOKIE_CONFIG } from "./config";

interface CookieConfig {
	domain?: string;
	secure: boolean;
	sameSite: "strict" | "lax" | "none";
	expireDays: number;
}

export class ConsentCookieManager {
	private config: CookieConfig;
	private environment: "production" | "preview" | "dev";

	constructor(config?: Partial<CookieConfig>, sessionContext?: SessionContext) {
		this.config = {
			...DEFAULT_COOKIE_CONFIG,
			...config,
		};
		
		// Determine environment
		if (!sessionContext) {
			this.environment = "dev";
		} else {
			this.environment = sessionContext.campaignEnvironment === "production" ? "production" : "preview";
		}
	}

	private getCookieOptions(expires?: number) {
		return {
			domain: this.config.domain,
			secure: this.config.secure,
			sameSite: this.config.sameSite,
			expires: expires || this.config.expireDays,
		};
	}

	private shouldSetCookies(): boolean {
		// Don't set cookies in dev environment, but allow banner to show
		return this.environment !== "dev";
	}

	private getUserIdCookieName(campaignId?: string): string {
		// In preview mode, scope user ID by campaign to prevent cross-customer collisions
		if (this.environment === "preview" && campaignId) {
			return `${COOKIE_NAMES.USER_ID}_${campaignId}`;
		}
		return COOKIE_NAMES.USER_ID;
	}

	setConsentCookie(consentState: ConsentState): void {
		const cookieValue = {
			preferences: consentState.preferences,
			hasUserInteracted: consentState.hasUserInteracted,
			timestamp: consentState.timestamp,
			version: consentState.version,
		};

		Cookies.set(
			COOKIE_NAMES.CONSENT,
			JSON.stringify(cookieValue),
			this.getCookieOptions()
		);
	}

	getConsentCookie(): ConsentState | null {
		const cookie = Cookies.get(COOKIE_NAMES.CONSENT);
		if (!cookie) return null;

		try {
			return JSON.parse(cookie) as ConsentState;
		} catch {
			return null;
		}
	}

	removeConsentCookie(): void {
		Cookies.remove(COOKIE_NAMES.CONSENT, {
			domain: this.config.domain,
		});
	}

	setUserIdCookie(userId: string, campaignId?: string): void {
		if (!this.shouldSetCookies()) return;

		const cookieName = this.getUserIdCookieName(campaignId);
		Cookies.set(
			cookieName,
			userId,
			this.getCookieOptions(365) // 1 year
		);
	}

	getUserIdCookie(campaignId?: string): string | null {
		const cookieName = this.getUserIdCookieName(campaignId);
		return Cookies.get(cookieName) || null;
	}

	removeUserIdCookie(campaignId?: string): void {
		const cookieName = this.getUserIdCookieName(campaignId);
		Cookies.remove(cookieName, {
			domain: this.config.domain,
		});
	}

	setSessionCookie(campaignId: string, sessionData: unknown): void {
		if (!this.shouldSetCookies()) return;

		const cookieName = COOKIE_NAMES.SESSION(campaignId);
		
		// Session cookie expires in 30 minutes
		const thirtyMinutesInDays = 30 / (24 * 60); // 30 minutes as fraction of a day
		
		Cookies.set(
			cookieName,
			JSON.stringify(sessionData),
			this.getCookieOptions(thirtyMinutesInDays)
		);
	}

	getSessionCookie(campaignId: string): unknown | null {
		const cookieName = COOKIE_NAMES.SESSION(campaignId);
		const cookie = Cookies.get(cookieName);
		
		if (!cookie) return null;

		try {
			return JSON.parse(cookie);
		} catch {
			return null;
		}
	}

	removeSessionCookie(campaignId: string): void {
		const cookieName = COOKIE_NAMES.SESSION(campaignId);
		Cookies.remove(cookieName, {
			domain: this.config.domain,
		});
	}

	manageCookiesBasedOnConsent(
		preferences: ConsentPreferences,
		sessionContext: SessionContext
	): void {
		// Always allow necessary cookies (but respect environment)
		if (preferences.necessary && this.shouldSetCookies()) {
			this.setUserIdCookie(sessionContext.userId, sessionContext.session.campaignId);
			this.setSessionCookie(sessionContext.session.campaignId, sessionContext.session);
		}

		// Remove cookies if consent is withdrawn
		if (!preferences.necessary) {
			this.removeUserIdCookie(sessionContext.session.campaignId);
			this.removeSessionCookie(sessionContext.session.campaignId);
		}

		// Analytics cookies are typically handled by GTM
		// Marketing cookies are typically handled by third-party scripts
		// Functional cookies would be managed here if needed
	}

	clearAllConsentCookies(campaignId?: string): void {
		this.removeConsentCookie();
		this.removeUserIdCookie(campaignId);
		
		if (campaignId) {
			this.removeSessionCookie(campaignId);
		}
		
		// Clear any other consent-related cookies
		const allCookies = Cookies.get();
		
		for (const cookieName of Object.keys(allCookies)) {
			// Remove any firebuzz session cookies
			if (cookieName.startsWith("frbzz_session_")) {
				Cookies.remove(cookieName, { domain: this.config.domain });
			}
			
			// Remove any other consent-related cookies
			if (cookieName.startsWith("frbzz_")) {
				Cookies.remove(cookieName, { domain: this.config.domain });
			}
		}
	}

	// Utility methods for checking consent status
	hasUserConsent(): boolean {
		const consent = this.getConsentCookie();
		return consent?.hasUserInteracted === true;
	}

	hasAnalyticsConsent(): boolean {
		const consent = this.getConsentCookie();
		return consent?.preferences.analytics === true;
	}

	hasMarketingConsent(): boolean {
		const consent = this.getConsentCookie();
		return consent?.preferences.marketing === true;
	}

	hasFunctionalConsent(): boolean {
		const consent = this.getConsentCookie();
		return consent?.preferences.functional === true;
	}

	// Utility methods for environment handling
	isDevEnvironment(): boolean {
		return this.environment === "dev";
	}

	isPreviewEnvironment(): boolean {
		return this.environment === "preview";
	}

	isProductionEnvironment(): boolean {
		return this.environment === "production";
	}

	shouldShowBannerInDevMode(): boolean {
		// Always show banner in dev mode for testing UI, but don't set cookies
		return this.environment === "dev";
	}
}

// Export utility functions
export const createCookieManager = (config?: Partial<CookieConfig>, sessionContext?: SessionContext) => 
	new ConsentCookieManager(config, sessionContext);

// Default singleton instance (without session context)
export const cookieManager = new ConsentCookieManager();