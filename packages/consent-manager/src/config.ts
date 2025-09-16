import type { ConsentPreferences, GTMConsentDefaults } from "./types";

export const CONSENT_VERSION = 1;

export const DEFAULT_CONSENT_PREFERENCES: ConsentPreferences = {
	necessary: true,
	analytics: false,
	marketing: false,
	functional: false,
};

export const COOKIE_NAMES = {
	CONSENT: "frbzz_consent",
} as const;

export const DEFAULT_COOKIE_CONFIG = {
	domain: undefined,
	secure: true,
	sameSite: "lax" as const,
	expireDays: 365,
};

export const DEFAULT_GTM_CONSENT: GTMConsentDefaults = {
	analytics_storage: "denied",
	ad_storage: "denied",
	ad_user_data: "denied",
	ad_personalization: "denied",
	functionality_storage: "denied",
	personalization_storage: "denied",
	security_storage: "granted",
	wait_for_update: 500,
};
