// Main exports
export { ConsentProvider, useInitializeConsentFromWindow } from "./provider";

// Hooks
export {
	useConsent,
	useConsentStatus,
	useConsentModal,
	useConsentTexts,
	useConsentBanner,
	useConsentCategories,
	useSessionContext,
	useAnalyticsConsent,
	useMarketingConsent,
	useFunctionalConsent,
	useNecessaryConsent,
} from "./hooks";

// Types
export type {
	ConsentPreferences,
	ConsentState,
	ConsentProviderConfig,
	ConsentTexts,
	ConsentContextValue,
	SessionContext,
	ConsentRecord,
	GTMConsentDefaults,
	GTMConsentUpdate,
} from "./types";

// API
export {
	ConsentApiClient,
	configureApiClient,
	getApiClient,
	recordConsent,
	updateConsent,
	revokeConsent,
} from "./api";

// Cookie management
export { ConsentCookieManager, cookieManager, createCookieManager } from "./cookies";

// GTM integration
export {
	GTMConsentManager,
	createGTMConsentManager,
	updateGTMConsent,
	mapConsentToGTM,
} from "./gtm";

// i18n
export {
	getTranslation,
	getSupportedLanguages,
	isLanguageSupported,
	translations,
} from "./i18n";

export type { SupportedLanguage, TranslationKey } from "./i18n";

// Configuration
export {
	DEFAULT_CONSENT_PREFERENCES,
	DEFAULT_GTM_CONSENT,
	DEFAULT_TEXTS,
	DEFAULT_PROVIDER_CONFIG,
	COOKIE_NAMES,
	CONSENT_VERSION,
} from "./config";