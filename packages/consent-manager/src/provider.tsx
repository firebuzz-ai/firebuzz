"use client";

import { Provider } from "jotai";
import { useAtom, useSetAtom } from "jotai";
import { useEffect, useMemo } from "react";
import { configureApiClient, recordConsent } from "./api";
import {
	sessionContextAtom,
	consentTextsAtom,
	createInitialConsentStateAtom,
	consentStateAtom,
	isLoadingAtom,
} from "./atoms";
import { createCookieManager } from "./cookies";
import { createGTMConsentManager } from "./gtm";
import { getTranslation } from "./i18n";
import type { ConsentProviderConfig, ConsentPreferences } from "./types";
import { DEFAULT_PROVIDER_CONFIG } from "./config";

interface ConsentProviderProps extends ConsentProviderConfig {
	children: React.ReactNode;
}

function ConsentProviderInner({ children, ...userConfig }: ConsentProviderProps) {
	// Merge user config with defaults
	const config = {
		...DEFAULT_PROVIDER_CONFIG,
		...userConfig,
		// Extract values from session context as fallbacks
		workspaceId: userConfig.workspaceId || userConfig.sessionContext?.gdprSettings?.countryCode || DEFAULT_PROVIDER_CONFIG.workspaceId,
		projectId: userConfig.projectId || DEFAULT_PROVIDER_CONFIG.projectId,
		campaignId: userConfig.campaignId || userConfig.sessionContext?.session?.campaignId || DEFAULT_PROVIDER_CONFIG.campaignId,
	};
	const [sessionContext, setSessionContext] = useAtom(sessionContextAtom);
	const [consentState, setConsentState] = useAtom(consentStateAtom);
	const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
	const setTexts = useSetAtom(consentTextsAtom);
	const createInitialState = useSetAtom(createInitialConsentStateAtom);

	// Initialize cookie manager with config and session context
	const cookieManager = useMemo(
		() => createCookieManager(config.cookies, sessionContext || undefined),
		[config.cookies, sessionContext]
	);

	// Initialize GTM consent manager if configured
	const gtmManager = useMemo(() => {
		if (!config.gtm) return null;
		
		return createGTMConsentManager(
			config.gtm.consentDefaults,
			config.debug
		);
	}, [config.gtm, config.debug]);

	// Initialize API client
	useEffect(() => {
		if (config.workerEndpoint) {
			configureApiClient({
				workerEndpoint: config.workerEndpoint,
				workspaceId: config.workspaceId,
				projectId: config.projectId,
				campaignId: config.campaignId,
				debug: config.debug,
			});
		}
	}, [config]);

	// Set session context
	useEffect(() => {
		setSessionContext(config.sessionContext);
	}, [config.sessionContext, setSessionContext]);

	// Initialize texts based on language and custom translations
	useEffect(() => {
		const language = config.i18n?.language || config.sessionContext.gdprSettings.language;
		const texts = getTranslation(language, config.i18n?.customTranslations);
		setTexts(texts);
	}, [config.i18n, config.sessionContext.gdprSettings.language, setTexts]);

	// Create initial consent state when session context is available
	useEffect(() => {
		if (sessionContext) {
			createInitialState();
		}
	}, [sessionContext, createInitialState]);

	// Set default consent when session context and GTM manager are available
	useEffect(() => {
		if (sessionContext && gtmManager) {
			// Only set default consent if GDPR is enabled and consent is required
			if (sessionContext.gdprSettings.isEnabled && sessionContext.gdprSettings.isRequiredConsent) {
				gtmManager.setDefaultConsent();
			}
		}
	}, [sessionContext, gtmManager]);

	// Load existing consent from cookies
	useEffect(() => {
		if (!sessionContext) return;

		const existingConsent = cookieManager.getConsentCookie();
		if (existingConsent) {
			setConsentState(existingConsent);
		}
	}, [sessionContext, cookieManager, setConsentState]);

	// Handle consent changes - update cookies, GTM, and API
	useEffect(() => {
		if (!consentState || !sessionContext || isLoading) return;

		const handleConsentChange = async () => {
			try {
				setIsLoading(true);

				// Update cookies based on consent
				cookieManager.setConsentCookie(consentState);
				cookieManager.manageCookiesBasedOnConsent(
					consentState.preferences,
					sessionContext
				);

				// Update GTM consent mode
				if (gtmManager) {
					gtmManager.updateConsent(consentState.preferences);
				}

				// Record consent to API if user has interacted
				if (consentState.hasUserInteracted) {
					try {
						await recordConsent(consentState.preferences, sessionContext);
					} catch (error) {
						if (config.debug) {
							console.error("Failed to record consent:", error);
						}
						// Don't throw - consent should still work if API fails
					}
				}
			} catch (error) {
				if (config.debug) {
					console.error("Error handling consent change:", error);
				}
			} finally {
				setIsLoading(false);
			}
		};

		handleConsentChange();
	}, [
		consentState,
		sessionContext,
		isLoading,
		cookieManager,
		gtmManager,
		config.debug,
		setIsLoading,
	]);

	// Don't render children until we have session context
	if (!sessionContext) {
		return null;
	}

	// If consent management is disabled, just render children
	if (
		!config.enabled ||
		!sessionContext.gdprSettings.isEnabled ||
		!sessionContext.gdprSettings.isRequiredConsent
	) {
		return <>{children}</>;
	}

	return <>{children}</>;
}

export function ConsentProvider(props: ConsentProviderProps) {
	return (
		<Provider>
			<ConsentProviderInner {...props} />
		</Provider>
	);
}

// Hook to initialize consent manager with session context from window
export function useInitializeConsentFromWindow() {
	const setSessionContext = useSetAtom(sessionContextAtom);

	useEffect(() => {
		// Try to get session context from window
		if (typeof window !== "undefined" && window.__FIREBUZZ_SESSION_CONTEXT__) {
			setSessionContext(window.__FIREBUZZ_SESSION_CONTEXT__);
		}
	}, [setSessionContext]);
}