import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import {
  CONSENT_VERSION,
  DEFAULT_CONSENT_PREFERENCES,
  DEFAULT_TEXTS,
} from "./config";
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
  }
);

export const isLoadingAtom = atom(false);

export const showBannerAtom = atom((get) => {
  const consentState = get(consentStateAtom);
  const sessionContext = get(sessionContextAtom);

  // In dev environment (no session context), always show banner for UI testing
  if (!sessionContext) {
    return true;
  }

  // Don't show banner if GDPR is not enabled or not required
  if (
    !sessionContext.gdprSettings.isEnabled ||
    !sessionContext.gdprSettings.isRequiredConsent
  ) {
    return false;
  }

  // Don't show banner if user has already interacted
  if (consentState?.hasUserInteracted) {
    return false;
  }

  return true;
});

export const showModalAtom = atom(false);

export const consentTextsAtom = atom<ConsentTexts>(DEFAULT_TEXTS);

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

export const createInitialConsentStateAtom = atom(null, (get, set) => {
  const sessionContext = get(sessionContextAtom);

  if (!sessionContext) return;

  const currentState = get(consentStateAtom);

  // Don't create initial state if already exists
  if (currentState) return;

  // Create initial state based on GDPR requirements
  const initialState: ConsentState = {
    preferences: DEFAULT_CONSENT_PREFERENCES,
    hasUserInteracted: false,
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
  }
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
});
