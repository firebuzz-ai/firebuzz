import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import {
	acceptAllConsentAtom,
	consentStateAtom,
	consentTextsAtom,
	isLoadingAtom,
	rejectAllConsentAtom,
	resetConsentAtom,
	sessionContextAtom,
	shouldSetCookiesAtom,
	showBannerAtom,
	showModalAtom,
	updateConsentAtom,
} from "./atoms";
import type { ConsentPreferences, ConsentTexts } from "./types";

// Utility function to check if DNT is enabled in browser
const isDNTEnabled = (): boolean => {
	if (typeof window === "undefined" || typeof navigator === "undefined") {
		return false;
	}
	// DNT can be "1" (enabled), "0" (disabled), or null/undefined (not set)
	return navigator.doNotTrack === "1";
};

export interface UseConsentReturn {
	consentState: ReturnType<typeof useAtomValue<typeof consentStateAtom>>;
	isLoading: boolean;
	updateConsent: (preferences: Partial<ConsentPreferences>) => void;
	acceptAll: () => void;
	rejectAll: () => void;
	resetConsent: () => void;
	getConsentStatus: (category: keyof ConsentPreferences) => boolean;
	showBanner: boolean;
	showModal: boolean;
	setShowModal: (show: boolean) => void;
	texts: ConsentTexts;
	shouldSetCookies: boolean;
	// GDPR/consent requirement state
	isConsentRequired: boolean;
	isEuUser: boolean;
	isCalifornianUser: boolean;
	language: string;
	countryCode: string;
	// DNT (Do Not Track) state
	isRespectDNTEnabled: boolean;
	isDNTEnabled: boolean;
	// Legal document URLs
	privacyPolicyUrl?: string;
	termsOfServiceUrl?: string;
}

export const useConsent = (): UseConsentReturn => {
	const consentState = useAtomValue(consentStateAtom);
	const isLoading = useAtomValue(isLoadingAtom);
	const showBanner = useAtomValue(showBannerAtom);
	const [showModal, setShowModal] = useAtom(showModalAtom);
	const texts = useAtomValue(consentTextsAtom);
	const shouldSetCookies = useAtomValue(shouldSetCookiesAtom);
	const sessionContext = useAtomValue(sessionContextAtom);

	const updateConsent = useSetAtom(updateConsentAtom);
	const acceptAll = useSetAtom(acceptAllConsentAtom);
	const rejectAll = useSetAtom(rejectAllConsentAtom);
	const resetConsent = useSetAtom(resetConsentAtom);

	const getConsentStatus = useCallback(
		(category: keyof ConsentPreferences): boolean => {
			return consentState?.preferences[category] ?? false;
		},
		[consentState],
	);

	return {
		consentState,
		isLoading,
		updateConsent,
		acceptAll,
		rejectAll,
		resetConsent,
		getConsentStatus,
		showBanner,
		showModal,
		setShowModal,
		texts,
		shouldSetCookies: Boolean(shouldSetCookies),
		// GDPR/consent requirement state from session context
		isConsentRequired: sessionContext?.gdprSettings.isRequiredConsent ?? false,
		isEuUser: sessionContext?.gdprSettings.isEU ?? false,
		isCalifornianUser: sessionContext?.gdprSettings.isCalifornian ?? false,
		language: sessionContext?.gdprSettings.language ?? "en-US",
		countryCode: sessionContext?.gdprSettings.countryCode ?? "US",
		// DNT (Do Not Track) state
		isRespectDNTEnabled:
			sessionContext?.gdprSettings.isRespectDNTEnabled ?? false,
		isDNTEnabled: isDNTEnabled(),
		// Legal document URLs
		privacyPolicyUrl: sessionContext?.gdprSettings.privacyPolicyUrl,
		termsOfServiceUrl: sessionContext?.gdprSettings.termsOfServiceUrl,
	};
};

export interface UseConsentStatusReturn {
	hasNecessary: boolean;
	hasAnalytics: boolean;
	hasMarketing: boolean;
	hasFunctional: boolean;
	hasUserInteracted: boolean;
	shouldSetCookies: boolean;
}

export const useConsentStatus = (): UseConsentStatusReturn => {
	const consentState = useAtomValue(consentStateAtom);
	const shouldSetCookies = useAtomValue(shouldSetCookiesAtom);

	return {
		hasNecessary: Boolean(consentState?.preferences.necessary),
		hasAnalytics: Boolean(consentState?.preferences.analytics),
		hasMarketing: Boolean(consentState?.preferences.marketing),
		hasFunctional: Boolean(consentState?.preferences.functional),
		hasUserInteracted: Boolean(consentState?.hasUserInteracted),
		shouldSetCookies: Boolean(shouldSetCookies),
	};
};

export interface UseConsentModalReturn {
	showModal: boolean;
	setShowModal: (show: boolean) => void;
	openModal: () => void;
	closeModal: () => void;
}

export const useConsentModal = (): UseConsentModalReturn => {
	const [showModal, setShowModal] = useAtom(showModalAtom);

	const openModal = useCallback(() => {
		setShowModal(true);
	}, [setShowModal]);

	const closeModal = useCallback(() => {
		setShowModal(false);
	}, [setShowModal]);

	return {
		showModal,
		setShowModal,
		openModal,
		closeModal,
	};
};

export interface UseConsentTextsReturn {
	texts: ConsentTexts;
	updateTexts: (newTexts: ConsentTexts) => void;
}

export const useConsentTexts = (): UseConsentTextsReturn => {
	const [texts, setTexts] = useAtom(consentTextsAtom);

	const updateTexts = useCallback(
		(newTexts: ConsentTexts) => {
			setTexts(newTexts);
		},
		[setTexts],
	);

	return {
		texts,
		updateTexts,
	};
};

export interface UseConsentBannerReturn {
	showBanner: boolean;
	acceptAll: () => void;
	rejectAll: () => void;
	openModal: () => void;
	texts: ConsentTexts["banner"];
}

export const useConsentBanner = (): UseConsentBannerReturn => {
	const showBanner = useAtomValue(showBannerAtom);
	const acceptAll = useSetAtom(acceptAllConsentAtom);
	const rejectAll = useSetAtom(rejectAllConsentAtom);
	const setShowModal = useSetAtom(showModalAtom);
	const texts = useAtomValue(consentTextsAtom);

	const openModal = useCallback(() => {
		setShowModal(true);
	}, [setShowModal]);

	return {
		showBanner,
		acceptAll,
		rejectAll,
		openModal,
		texts: texts.banner,
	};
};

export interface UseConsentCategoriesReturn {
	preferences: ConsentPreferences;
	updateCategory: (category: keyof ConsentPreferences, value: boolean) => void;
	texts: ConsentTexts["categories"];
}

export const useConsentCategories = (): UseConsentCategoriesReturn => {
	const consentState = useAtomValue(consentStateAtom);
	const updateConsent = useSetAtom(updateConsentAtom);
	const texts = useAtomValue(consentTextsAtom);

	const updateCategory = useCallback(
		(category: keyof ConsentPreferences, value: boolean) => {
			updateConsent({ [category]: value });
		},
		[updateConsent],
	);

	return {
		preferences: consentState?.preferences ?? {
			necessary: true,
			analytics: false,
			marketing: false,
			functional: false,
		},
		updateCategory,
		texts: texts.categories,
	};
};

// Note: useSessionContext has been removed and made internal.
// Use useConsent hook instead which now includes GDPR state (isConsentRequired, etc.)

// Convenience hook for checking specific consent categories
export const useAnalyticsConsent = (): boolean => {
	const consentState = useAtomValue(consentStateAtom);
	return consentState?.preferences.analytics ?? false;
};

export const useMarketingConsent = (): boolean => {
	const consentState = useAtomValue(consentStateAtom);
	return consentState?.preferences.marketing ?? false;
};

export const useFunctionalConsent = (): boolean => {
	const consentState = useAtomValue(consentStateAtom);
	return consentState?.preferences.functional ?? false;
};

export const useNecessaryConsent = (): boolean => {
	const consentState = useAtomValue(consentStateAtom);
	return consentState?.preferences.necessary ?? false;
};
