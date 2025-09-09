import type { ConsentTexts, ConsentPreferences, GTMConsentDefaults } from "./types";

export const CONSENT_VERSION = 1;

export const DEFAULT_CONSENT_PREFERENCES: ConsentPreferences = {
	necessary: true,
	analytics: false,
	marketing: false,
	functional: false,
};

export const COOKIE_NAMES = {
	CONSENT: "frbzz_consent",
	USER_ID: "frbzz_uid",
	SESSION: (campaignId: string) => `frbzz_session_${campaignId}`,
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

export const DEFAULT_PROVIDER_CONFIG = {
	workerEndpoint: "/api/consent",
	workspaceId: "",
	projectId: "",
	campaignId: "",
	debug: false,
	enabled: true,
};

export const DEFAULT_TEXTS: ConsentTexts = {
	banner: {
		title: "We use cookies",
		description: "We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking 'Accept All', you consent to our use of cookies.",
		acceptAll: "Accept All",
		rejectAll: "Reject All",
		manageCookies: "Manage Cookies",
	},
	modal: {
		title: "Cookie Preferences",
		description: "Choose which cookies you want to accept. You can change these settings at any time.",
		save: "Save Preferences",
		acceptAll: "Accept All",
		rejectAll: "Reject All",
		close: "Close",
	},
	categories: {
		necessary: {
			title: "Strictly Necessary",
			description: "These cookies are essential for the website to function properly. They cannot be disabled.",
		},
		analytics: {
			title: "Analytics",
			description: "These cookies help us understand how visitors interact with our website by collecting and reporting information.",
		},
		marketing: {
			title: "Marketing",
			description: "These cookies are used to deliver advertisements more relevant to you and your interests.",
		},
		functional: {
			title: "Functional",
			description: "These cookies enhance functionality and personalization, such as videos and live chats.",
		},
	},
	footer: {
		privacyPolicy: "Privacy Policy",
		cookiePolicy: "Cookie Policy",
	},
};