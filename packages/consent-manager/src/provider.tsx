"use client";

import { Provider, useAtom, useSetAtom } from "jotai";
import type * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { configureApiClient, recordConsent } from "./api";
import {
	consentStateAtom,
	consentTextsAtom,
	createInitialConsentStateAtom,
	isLoadingAtom,
	lastRecordedConsentAtom,
	sessionContextAtom,
} from "./atoms";
import { createCookieManager } from "./cookies";
import { createGTMConsentManager } from "./gtm";
import { resolveTranslation } from "./i18n";
import type { ConsentProviderConfig } from "./types";

interface ConsentProviderProps extends ConsentProviderConfig {
	children: React.ReactNode;
}

function ConsentProviderInner({
	children,
	...userConfig
}: ConsentProviderProps) {
	// Use state to track session context instead of useMemo to avoid dependency issues
	const [config, setConfig] = useState(() => {
		const windowSessionContext =
			typeof window !== "undefined"
				? window.__FIREBUZZ_SESSION_CONTEXT__
				: null;

		if (userConfig.debug) {
			console.log(
				"[Consent Manager] Initial config creation - windowSessionContext:",
				windowSessionContext ? "found" : "not found",
			);
			if (windowSessionContext) {
				console.log(
					"[Consent Manager] Session context structure:",
					JSON.stringify(windowSessionContext, null, 2),
				);
			}
		}

		return {
			...userConfig,
			// Extract values from session context
			sessionContext: windowSessionContext,
			workerEndpoint: windowSessionContext?.apiBaseUrl,
			workspaceId: windowSessionContext?.workspaceId,
			projectId: windowSessionContext?.projectId,
			campaignId: windowSessionContext?.campaignId,
			debug: userConfig.debug ?? false,
			enabled: true, // Always enabled, behavior controlled by session context
		};
	});

	// Check for session context updates (for cases where it's set after component mount)
	useEffect(() => {
		let intervalId: number | undefined;

		const handleSessionReady = () => {
			const windowSessionContext =
				typeof window !== "undefined"
					? window.__FIREBUZZ_SESSION_CONTEXT__
					: null;

			if (userConfig.debug) {
				console.log("[Consent Manager] Polling session context:", {
					windowSessionContext: windowSessionContext ? "found" : "not found",
					configSessionContext: config.sessionContext ? "found" : "not found",
					shouldUpdate: windowSessionContext && !config.sessionContext,
				});
			}

			if (windowSessionContext && !config.sessionContext) {
				if (userConfig.debug) {
					console.log(
						"[Consent Manager] Session context found after mount, updating config",
					);
				}
				setConfig((prev) => ({
					...prev,
					sessionContext: windowSessionContext,
					workerEndpoint: windowSessionContext.apiBaseUrl,
					workspaceId: windowSessionContext.workspaceId,
					projectId: windowSessionContext.projectId,
					campaignId: windowSessionContext.campaignId,
				}));

				// Clear the interval once we find session context
				if (intervalId) clearInterval(intervalId);
			}
		};

		// Check immediately
		handleSessionReady();

		// If no session context found, poll for it
		if (!config.sessionContext && typeof window !== "undefined") {
			intervalId = window.setInterval(handleSessionReady, 50); // Check every 50ms for up to a few seconds

			// Clear after 2 seconds to avoid infinite polling
			setTimeout(() => {
				if (intervalId) clearInterval(intervalId);
			}, 2000);
		}

		// Also listen for session ready event
		if (typeof window !== "undefined") {
			window.addEventListener("firebuzz-session-ready", handleSessionReady);
			return () => {
				window.removeEventListener(
					"firebuzz-session-ready",
					handleSessionReady,
				);
				if (intervalId) clearInterval(intervalId);
			};
		}
	}, [config.sessionContext, userConfig.debug]);

	const [sessionContext, setSessionContext] = useAtom(sessionContextAtom);
	const [consentState, setConsentState] = useAtom(consentStateAtom);
	const [lastRecordedConsent, setLastRecordedConsent] = useAtom(
		lastRecordedConsentAtom,
	);
	const setIsLoading = useSetAtom(isLoadingAtom);
	const setTexts = useSetAtom(consentTextsAtom);
	const createInitialState = useSetAtom(createInitialConsentStateAtom);

	// Track if consent state change is from initial cookie load (should not trigger API call)
	const isInitialLoadRef = useRef(true);

	// Initialize cookie manager with config and session context
	const cookieManager = useMemo(
		() => createCookieManager(config.cookies, sessionContext || undefined),
		[config.cookies, sessionContext],
	);

	// Initialize GTM consent manager if configured
	const gtmManager = useMemo(() => {
		if (!config.gtm) return null;

		return createGTMConsentManager(config.gtm.consentDefaults, config.debug);
	}, [config.gtm, config.debug]);

	// Initialize API client
	useEffect(() => {
		if (
			config.workerEndpoint &&
			config.workspaceId &&
			config.projectId &&
			config.campaignId
		) {
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
		if (config.sessionContext) {
			setSessionContext(config.sessionContext);
		}
	}, [config.sessionContext, setSessionContext]);

	// Initialize texts based on language configuration and GDPR localization settings
	useEffect(() => {
		const gdprSettings = config.sessionContext?.gdprSettings;
		const isLocalizationEnabled = gdprSettings?.isLocalizationEnabled ?? true; // Default to enabled

		// Determine language based on localization settings
		const language = isLocalizationEnabled
			? // Use server-detected language when localization is enabled
				gdprSettings?.language || config.translations.language || "en"
			: // Use configured language when localization is disabled
				config.translations.language || "en";

		const texts = resolveTranslation(
			language,
			config.translations.translations,
			config.translations.fallbackLanguage,
		);

		if (config.debug) {
			console.log(
				`[Consent Manager] Localization ${isLocalizationEnabled ? "enabled" : "disabled"}, using language: ${language}`,
			);
		}

		setTexts(texts);
	}, [
		config.translations,
		config.sessionContext?.gdprSettings,
		config.debug,
		setTexts,
	]);

	// Create initial consent state
	// In dev mode (no session context): Still create state for UI functionality
	// In real mode (with session context): Create state with proper GDPR settings
	useEffect(() => {
		// Always create initial state for UI to work
		createInitialState();
	}, [createInitialState]);

	// Set default consent when session context and GTM manager are available
	useEffect(() => {
		if (sessionContext && gtmManager) {
			// Only set default consent if GDPR is enabled and consent is required
			if (
				sessionContext.gdprSettings.isEnabled &&
				sessionContext.gdprSettings.isRequiredConsent
			) {
				gtmManager.setDefaultConsent();
			}
		}
	}, [sessionContext, gtmManager]);

	// Load existing consent from cookies
	// Works in both dev and real environments for state persistence
	useEffect(() => {
		const existingConsent = cookieManager.getConsentCookie();
		if (existingConsent) {
			setConsentState(existingConsent);
			// Also set this as last recorded consent to prevent duplicate API calls
			// when the same consent is loaded from cookies
			if (sessionContext) {
				setLastRecordedConsent({
					preferences: { ...existingConsent.preferences },
					timestamp: existingConsent.timestamp,
					userId: sessionContext.userId,
				});
			}
		}
		// Mark initial load as complete after first run
		isInitialLoadRef.current = false;
	}, [cookieManager, setConsentState, sessionContext, setLastRecordedConsent]);

	// Handle consent changes - update cookies, GTM, and API
	useEffect(() => {
		if (!consentState) return;

		const handleConsentChange = async () => {
			try {
				setIsLoading(true);

				// GDPR Compliance Note:
				// - Consent controls cookie setting only, not analytics data collection
				// - Analytics runs under legitimate interest regardless of consent
				// - Session/user cookies are only set when explicit consent is given
				// - Analytics package handles ephemeral tracking when no consent

				// Always update consent cookie for state persistence
				cookieManager.setConsentCookie(consentState);

				// In dev environment, skip API and GTM but cookie is already set above
				if (!sessionContext) {
					if (config.debug) {
						console.log(
							"[Consent Manager] Dev mode: State saved, API/GTM skipped",
						);
					}
					setIsLoading(false);
					return;
				}

				// Update GTM consent mode
				if (gtmManager) {
					gtmManager.updateConsent(consentState.preferences);
				}

				// Record consent to API if user has interacted, session context is available,
				// this is not the initial load, and preferences have actually changed since last API call
				if (
					consentState.hasUserInteracted &&
					sessionContext &&
					!isInitialLoadRef.current
				) {
					// Check if consent preferences have changed since last API call
					const preferencesChanged =
						!lastRecordedConsent ||
						lastRecordedConsent.userId !== sessionContext.userId ||
						JSON.stringify(lastRecordedConsent.preferences) !==
							JSON.stringify(consentState.preferences);

					if (preferencesChanged) {
						try {
							await recordConsent(consentState.preferences, sessionContext);

							// Update last recorded consent to prevent future duplicates
							setLastRecordedConsent({
								preferences: { ...consentState.preferences },
								timestamp: Date.now(),
								userId: sessionContext.userId,
							});

							if (config.debug) {
								console.log(
									"[Consent Manager] Consent successfully recorded to API",
								);
							}
						} catch (error) {
							if (config.debug) {
								console.error("Failed to record consent:", error);
							}
							// Don't throw - consent should still work if API fails
						}
					} else {
						if (config.debug) {
							console.log(
								"[Consent Manager] Consent unchanged - skipping API call",
							);
						}
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
		lastRecordedConsent,
		setLastRecordedConsent,
		cookieManager,
		gtmManager,
		config.debug,
		setIsLoading,
	]);

	// Always render children - consent manager should work in all environments
	// When no session context: cookie banner works, GTM works, but API calls are skipped
	// When session context exists: full functionality including API calls
	if (!config.sessionContext && config.debug) {
		console.log(
			"[Consent Manager] Running in template/dev mode - API calls disabled, UI functionality enabled",
		);
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
