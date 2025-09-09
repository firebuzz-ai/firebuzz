export interface ConsentPreferences {
	necessary: boolean;
	analytics: boolean;
	marketing: boolean;
	functional: boolean;
}

export interface ConsentState {
	preferences: ConsentPreferences;
	hasUserInteracted: boolean;
	timestamp: number;
	version: number;
}

export interface SessionContext {
	userId: string;
	session: {
		sessionId: string;
		campaignId: string;
	};
	gdprSettings: {
		isEnabled: boolean;
		isRequiredConsent: boolean;
		isEU: boolean;
		isCalifornian: boolean;
		isIncludedCountry: boolean;
		isLocalizationEnabled: boolean;
		countryCode: string;
		language: string;
		isRespectDNTEnabled: boolean;
	};
	campaignEnvironment: "production" | "preview";
	abTestId?: string | null;
	abTestVariantId?: string | null;
}

export interface ConsentProviderConfig {
	sessionContext: SessionContext;
	workerEndpoint?: string;
	workspaceId?: string;
	projectId?: string;
	campaignId?: string;
	gtm?: {
		consentDefaults?: Partial<GTMConsentDefaults>;
	};
	i18n?: {
		language?: string;
		customTranslations?: Partial<ConsentTexts>;
	};
	cookies?: {
		domain?: string;
		secure?: boolean;
		sameSite?: "strict" | "lax" | "none";
		expireDays?: number;
	};
	debug?: boolean;
	enabled?: boolean;
}

export interface GTMConsentDefaults {
	analytics_storage: "granted" | "denied";
	ad_storage: "granted" | "denied";
	ad_user_data: "granted" | "denied";
	ad_personalization: "granted" | "denied";
	functionality_storage: "granted" | "denied";
	personalization_storage: "granted" | "denied";
	security_storage: "granted" | "denied";
	wait_for_update?: number;
}

export interface GTMConsentUpdate {
	analytics_storage?: "granted" | "denied";
	ad_storage?: "granted" | "denied";
	ad_user_data?: "granted" | "denied";
	ad_personalization?: "granted" | "denied";
	functionality_storage?: "granted" | "denied";
	personalization_storage?: "granted" | "denied";
}

export interface ConsentTexts {
	banner: {
		title: string;
		description: string;
		acceptAll: string;
		rejectAll: string;
		manageCookies: string;
	};
	modal: {
		title: string;
		description: string;
		save: string;
		acceptAll: string;
		rejectAll: string;
		close: string;
	};
	categories: {
		necessary: {
			title: string;
			description: string;
		};
		analytics: {
			title: string;
			description: string;
		};
		marketing: {
			title: string;
			description: string;
		};
		functional: {
			title: string;
			description: string;
		};
	};
	footer: {
		privacyPolicy?: string;
		cookiePolicy?: string;
	};
}

export interface ConsentRecord {
	userId: string;
	sessionId: string;
	workspaceId: string;
	projectId: string;
	campaignId: string;
	preferences: ConsentPreferences;
	timestamp: number;
	version: number;
	userAgent: string;
	ipAddress?: string;
	countryCode: string;
	language: string;
	isEU: boolean;
	isCalifornian: boolean;
}

export interface ConsentContextValue {
	consentState: ConsentState | null;
	isLoading: boolean;
	updateConsent: (preferences: Partial<ConsentPreferences>) => Promise<void>;
	acceptAll: () => Promise<void>;
	rejectAll: () => Promise<void>;
	resetConsent: () => Promise<void>;
	getConsentStatus: (category: keyof ConsentPreferences) => boolean;
	showBanner: boolean;
	showModal: boolean;
	setShowModal: (show: boolean) => void;
	texts: ConsentTexts;
}

declare global {
	interface Window {
		__FIREBUZZ_SESSION_CONTEXT__?: SessionContext;
		dataLayer?: Array<unknown>;
		gtag?: (...args: unknown[]) => void;
	}
}