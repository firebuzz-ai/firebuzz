// Main exports

// API
export {
	ConsentApiClient,
	configureApiClient,
	getApiClient,
	recordConsent,
	revokeAllConsent,
	updateConsent,
} from "./api";
// Configuration
export {
	CONSENT_VERSION,
	COOKIE_NAMES,
	DEFAULT_CONSENT_PREFERENCES,
	DEFAULT_GTM_CONSENT,
} from "./config";
// Cookie management
export {
	ConsentCookieManager,
	cookieManager,
	createCookieManager,
} from "./cookies";
// GTM integration
export {
	createGTMConsentManager,
	GTMConsentManager,
	mapConsentToGTM,
	updateGTMConsent,
} from "./gtm";
// Hooks
export {
	useAnalyticsConsent,
	useConsent,
	useConsentBanner,
	useConsentCategories,
	useConsentModal,
	useConsentStatus,
	useConsentTexts,
	useFunctionalConsent,
	useMarketingConsent,
	useNecessaryConsent,
} from "./hooks";
export type { SupportedLanguage, TranslationKey } from "./i18n";

// i18n
export {
	createTranslation,
	getAllLanguages,
	getBuiltInLanguages,
	hasLanguage,
	resolveTranslation,
	translations,
} from "./i18n";
export { ConsentProvider } from "./provider";
// Types
export type {
	ConsentContextValue,
	ConsentPreferences,
	ConsentProviderConfig,
	ConsentRecord,
	ConsentState,
	ConsentTexts,
	GTMConsentDefaults,
	GTMConsentUpdate,
	SessionContext,
	TranslationConfig,
} from "./types";
