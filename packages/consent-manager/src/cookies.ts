import Cookies from "js-cookie";
import { COOKIE_NAMES, DEFAULT_COOKIE_CONFIG } from "./config";
import type { ConsentState, SessionContext } from "./types";

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
			this.environment =
				sessionContext.campaignEnvironment === "production"
					? "production"
					: "preview";
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
			this.getCookieOptions(),
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

	// Session and user ID cookie management removed - handled by analytics package

	// Cookie management based on consent removed - analytics package handles session cookies

	clearAllConsentCookies(): void {
		this.removeConsentCookie();

		// Note: Session/user cookies are managed by analytics package
		// But we still clean up any existing firebuzz cookies for safety
		const allCookies = Cookies.get();

		for (const cookieName of Object.keys(allCookies)) {
			// Remove any firebuzz cookies (analytics package should handle its own cleanup)
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
export const createCookieManager = (
	config?: Partial<CookieConfig>,
	sessionContext?: SessionContext,
) => new ConsentCookieManager(config, sessionContext);

// Default singleton instance (without session context)
export const cookieManager = new ConsentCookieManager();
