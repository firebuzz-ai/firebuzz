import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { CONSENT_VERSION, DEFAULT_CONSENT_PREFERENCES } from "./config";
import type { ConsentState, ConsentTexts, SessionContext } from "./types";

export const sessionContextAtom = atom<SessionContext | null>(null);

export const consentStateAtom = atomWithStorage<ConsentState | null>(
	"frbzz_consent",
	null,
	{
		getItem: (key, initialValue) => {
			try {
				const stored = localStorage.getItem(key);
				if (!stored) return initialValue;

				const parsed = JSON.parse(stored) as ConsentState;

				// Version check - reset if version mismatch
				if (parsed.version !== CONSENT_VERSION) {
					localStorage.removeItem(key);
					return initialValue;
				}

				return parsed;
			} catch {
				return initialValue;
			}
		},
		setItem: (key, value) => {
			if (value === null) {
				localStorage.removeItem(key);
			} else {
				localStorage.setItem(key, JSON.stringify(value));
			}
		},
		removeItem: (key) => {
			localStorage.removeItem(key);
		},
	},
);

export const isLoadingAtom = atom(false);

export const showBannerAtom = atom((get) => {
	const consentState = get(consentStateAtom);
	const sessionContext = get(sessionContextAtom);

	// Check if banner is explicitly disabled via window flag (used in preview mode)
	if (
		typeof window !== "undefined" &&
		window.__FIREBUZZ_DISABLE_CONSENT_BANNER__
	) {
		return false;
	}

	// In dev environment (no session context), show banner only if user hasn't interacted
	if (!sessionContext) {
		return !consentState?.hasUserInteracted;
	}

	// Don't show banner if GDPR is not enabled or not required
	if (
		!sessionContext.gdprSettings.isEnabled ||
		!sessionContext.gdprSettings.isRequiredConsent
	) {
		return false;
	}

	// Don't show banner if DNT is enabled and we respect it
	// (DNT means user doesn't want to be tracked, so no need to ask)
	if (sessionContext.gdprSettings.isRespectDNTEnabled && isDNTEnabled()) {
		return false;
	}

	// Don't show banner if user has already interacted
	if (consentState?.hasUserInteracted) {
		return false;
	}

	return true;
});

export const showModalAtom = atom(false);

export const consentTextsAtom = atom<ConsentTexts>({
	banner: {
		title: "We value your privacy",
		description:
			"This site uses cookies to improve your browsing experience, analyze site traffic, and show personalized content.",
		acceptAll: "Accept All",
		rejectAll: "Reject All",
		manageCookies: "Customize",
	},
	modal: {
		title: "Privacy Settings",
		description:
			"Choose which cookies you want to accept. You can change these settings at any time.",
		save: "Save Preferences",
		acceptAll: "Accept All",
		rejectAll: "Reject All",
		close: "Close",
	},
	categories: {
		necessary: {
			title: "Strictly Necessary",
			description:
				"These cookies are essential for the website to function properly. They cannot be disabled.",
		},
		analytics: {
			title: "Analytics",
			description:
				"These cookies help us understand how visitors interact with our website by collecting and reporting information.",
		},
		marketing: {
			title: "Marketing",
			description:
				"These cookies are used to deliver advertisements more relevant to you and your interests.",
		},
		functional: {
			title: "Functional",
			description:
				"These cookies enhance functionality and personalization, such as videos and live chats.",
		},
	},
	footer: {
		privacyPolicy: "Privacy Policy",
		cookiePolicy: "Cookie Policy",
	},
});

export const shouldSetCookiesAtom = atom((get) => {
	const consentState = get(consentStateAtom);
	const sessionContext = get(sessionContextAtom);

	// In dev environment (no session context), don't set cookies but show banner
	if (!sessionContext) {
		return false;
	}

	// If GDPR is not enabled or not required, always allow cookies
	if (
		!sessionContext.gdprSettings.isEnabled ||
		!sessionContext.gdprSettings.isRequiredConsent
	) {
		return true;
	}

	// If user has given consent, check if they accepted at least necessary cookies
	return consentState?.hasUserInteracted && consentState?.preferences.necessary;
});

// Utility function to check if DNT is enabled in browser
const isDNTEnabled = (): boolean => {
	if (typeof window === "undefined" || typeof navigator === "undefined") {
		return false;
	}
	// DNT can be "1" (enabled), "0" (disabled), or null/undefined (not set)
	return navigator.doNotTrack === "1";
};

export const createInitialConsentStateAtom = atom(null, (get, set) => {
	const currentState = get(consentStateAtom);
	const sessionContext = get(sessionContextAtom);

	// Don't create initial state if already exists
	if (currentState) return;

	// Check if we should respect DNT
	const shouldRespectDNT =
		sessionContext?.gdprSettings?.isRespectDNTEnabled ?? false;
	const dntEnabled = isDNTEnabled();

	// Create initial state for both dev and real environments
	// In dev mode, we still need state management for UI functionality
	let initialPreferences = { ...DEFAULT_CONSENT_PREFERENCES };

	// If DNT is enabled and we're configured to respect it, auto-reject tracking
	if (shouldRespectDNT && dntEnabled) {
		initialPreferences = {
			necessary: true, // Always allow necessary cookies
			analytics: false, // Respect DNT for analytics
			marketing: false, // Respect DNT for marketing
			functional: false, // Respect DNT for functional
		};
	}

	const initialState: ConsentState = {
		preferences: initialPreferences,
		// If DNT is set, mark as user interacted to skip banner
		hasUserInteracted: shouldRespectDNT && dntEnabled,
		timestamp: Date.now(),
		version: CONSENT_VERSION,
	};

	set(consentStateAtom, initialState);
});

export const updateConsentAtom = atom(
	null,
	(get, set, preferences: Partial<ConsentState["preferences"]>) => {
		const currentState = get(consentStateAtom);

		if (!currentState) return;

		const newState: ConsentState = {
			...currentState,
			preferences: {
				...currentState.preferences,
				...preferences,
			},
			hasUserInteracted: true,
			timestamp: Date.now(),
		};

		set(consentStateAtom, newState);
		set(showModalAtom, false);
	},
);

export const acceptAllConsentAtom = atom(null, (_get, set) => {
	set(updateConsentAtom, {
		necessary: true,
		analytics: true,
		marketing: true,
		functional: true,
	});
});

export const rejectAllConsentAtom = atom(null, (_get, set) => {
	set(updateConsentAtom, {
		necessary: true,
		analytics: false,
		marketing: false,
		functional: false,
	});
});

export const resetConsentAtom = atom(null, (_get, set) => {
	set(consentStateAtom, null);
	set(showModalAtom, false);
	set(isLoadingAtom, false);
	set(lastRecordedConsentAtom, null);
});

// Atom to track the last preferences that were successfully recorded to the API
// This prevents duplicate API calls when consent hasn't actually changed
export const lastRecordedConsentAtom = atom<{
	preferences: ConsentState["preferences"];
	timestamp: number;
	userId: string;
} | null>(null);
