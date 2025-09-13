import { DEFAULT_GTM_CONSENT } from "./config";
import type {
	ConsentPreferences,
	GTMConsentDefaults,
	GTMConsentUpdate,
} from "./types";

export class GTMConsentManager {
	private consentDefaults: GTMConsentDefaults;
	private debug: boolean;

	constructor(consentDefaults?: Partial<GTMConsentDefaults>, debug = false) {
		this.consentDefaults = { ...DEFAULT_GTM_CONSENT, ...consentDefaults };
		this.debug = debug;
	}

	private log(message: string, ...args: unknown[]): void {
		if (this.debug) {
			console.log(`[GTM Consent] ${message}`, ...args);
		}
	}

	private ensureDataLayer(): void {
		if (typeof window !== "undefined" && !window.dataLayer) {
			window.dataLayer = [];
		}
	}

	private ensureGtag(): void {
		if (typeof window !== "undefined" && typeof window.gtag === "undefined") {
			window.gtag = (...args: unknown[]) => {
				window.dataLayer = window.dataLayer || [];
				window.dataLayer.push(args);
			};
		}
	}

	private pushToDataLayer(data: Record<string, unknown>): void {
		this.ensureDataLayer();
		if (window.dataLayer) {
			window.dataLayer.push(data);
			this.log("Pushed to dataLayer:", data);
		}
	}

	setDefaultConsent(): void {
		if (typeof window === "undefined") return;

		this.ensureDataLayer();
		this.ensureGtag();

		// Set default consent state using gtag
		if (window.gtag) {
			window.gtag("consent", "default", this.consentDefaults);
		}

		this.log("Default consent set:", this.consentDefaults);
	}

	updateConsent(preferences: ConsentPreferences): void {
		if (typeof window === "undefined") return;

		this.ensureGtag();

		const consentUpdate: GTMConsentUpdate = {
			analytics_storage: preferences.analytics ? "granted" : "denied",
			ad_storage: preferences.marketing ? "granted" : "denied",
			ad_user_data: preferences.marketing ? "granted" : "denied",
			ad_personalization: preferences.marketing ? "granted" : "denied",
			functionality_storage: preferences.functional ? "granted" : "denied",
			personalization_storage: preferences.functional ? "granted" : "denied",
		};

		// Use gtag to update consent - this is the proper way for Consent Mode v2
		if (window.gtag) {
			window.gtag("consent", "update", consentUpdate);
		}

		// Also push to dataLayer for any custom tracking
		this.pushToDataLayer({
			event: "consent_update",
			consent_preferences: preferences,
		});

		this.log("Consent updated:", consentUpdate);
	}

	// Method to manually push custom events
	pushEvent(eventName: string, parameters?: Record<string, unknown>): void {
		if (typeof window === "undefined") return;

		const eventData = {
			event: eventName,
			...parameters,
		};

		this.pushToDataLayer(eventData);
	}

	// Method to check if gtag is available
	isGtagAvailable(): boolean {
		if (typeof window === "undefined") return false;
		return typeof window.gtag !== "undefined";
	}
}

// Utility function to map consent preferences to GTM format
export const mapConsentToGTM = (
	preferences: ConsentPreferences,
): GTMConsentUpdate => ({
	analytics_storage: preferences.analytics ? "granted" : "denied",
	ad_storage: preferences.marketing ? "granted" : "denied",
	ad_user_data: preferences.marketing ? "granted" : "denied",
	ad_personalization: preferences.marketing ? "granted" : "denied",
	functionality_storage: preferences.functional ? "granted" : "denied",
	personalization_storage: preferences.functional ? "granted" : "denied",
});

// Utility function to create GTM consent manager
export const createGTMConsentManager = (
	consentDefaults?: Partial<GTMConsentDefaults>,
	debug = false,
): GTMConsentManager => {
	return new GTMConsentManager(consentDefaults, debug);
};

// Utility function to update GTM consent
export const updateGTMConsent = (
	gtmManager: GTMConsentManager,
	preferences: ConsentPreferences,
): void => {
	gtmManager.updateConsent(preferences);
};

// Export for external usage
export { GTMConsentManager as default };
