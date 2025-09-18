"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	trackEvent as apiTrackEvent,
	configureApiClient,
	initializeAnalytics,
	setSessionData,
	updateSessionConsent,
} from "./api";
import { AnalyticsContextProvider } from "./context";
import { mergeEventConfiguration } from "./event-config";
import { setupDefaultEventTracking } from "./tracking/default-events";
import type { AnalyticsProviderProps, TrackEventParams } from "./types";
import { isWebContainer, shouldDisableAnalytics } from "./utils/environment";
import { generateUniqueId } from "./utils/uuid";

/**
 * Analytics Provider Component
 */
export function AnalyticsProvider({
	consentState,
	customEvents = [],
	primaryGoal,
	defaultCurrency = "USD",
	enableDefaultEvents = true,
	debug = false,
	batching,
	externalLinkBehavior,
	sessionTimeoutMinutes,
	children,
}: AnalyticsProviderProps) {
	const [isInitialized, setIsInitialized] = useState(false);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [userId, setUserId] = useState<string | null>(null);

	// Extract session data from session context (injected by engine)
	const analyticsState = useMemo(() => {
		const sessionContext =
			typeof window !== "undefined"
				? window.__FIREBUZZ_SESSION_CONTEXT__
				: null;

		// Always use session context if available (analytics runs under legitimate interest)
		if (sessionContext) {
			return {
				apiUrl: sessionContext.apiBaseUrl,
				userId: sessionContext.userId,
				sessionId: sessionContext.session.sessionId,
				campaignId: sessionContext.campaignId,
				workspaceId: sessionContext.workspaceId,
				projectId: sessionContext.projectId,
				landingPageId: sessionContext.landingPageId,
				isAnonymous: false,
				isTestMode: false,
				enabled: true, // Session context means analytics is enabled
			};
		}

		// No session context means dev environment - analytics disabled
		if (debug) {
			console.warn(
				"[Analytics] No session context found - dev environment detected. Analytics disabled.",
			);
		}
		return {
			apiUrl: "https://engine-dev.frbzz.com", // Dev fallback
			userId: `anon-${generateUniqueId()}`,
			sessionId: `anon-${generateUniqueId()}`,
			campaignId: "unknown",
			workspaceId: "unknown",
			projectId: "unknown",
			landingPageId: undefined,
			isAnonymous: true,
			isTestMode: true, // Dev mode
			enabled: false, // No session context means disabled
		};
	}, [debug]);

	// Set session data in API module
	useEffect(() => {
		if (analyticsState?.enabled) {
			setSessionData({
				userId: analyticsState.userId,
				sessionId: analyticsState.sessionId,
				campaignId: analyticsState.campaignId,
			});
		}
	}, [analyticsState]);

	// Configure API client
	useEffect(() => {
		// Check if we should disable analytics based on environment
		const shouldDisable = !analyticsState.enabled || shouldDisableAnalytics();

		if (shouldDisable) {
			if (debug) {
				if (isWebContainer()) {
					console.log(
						"[Analytics] Analytics disabled in WebContainer environment",
					);
				} else {
					console.log(
						"[Analytics] Analytics disabled (no session context), skipping configuration",
					);
				}
			}
			return;
		}

		// Enable batching by default with user overrides
		const batchingConfig = {
			enabled: true, // Default enabled
			maxBatchSize: 10,
			maxWaitTime: 2000,
			debounceTime: 100,
			...batching, // User overrides
		};

		configureApiClient({
			apiUrl: analyticsState.apiUrl,
			campaignId: analyticsState.campaignId,
			workspaceId: analyticsState.workspaceId,
			projectId: analyticsState.projectId,
			landingPageId: analyticsState.landingPageId,
			defaultCurrency,
			debug,
			sessionTimeoutMinutes,
			batching: batchingConfig,
		});

		// Update session manager with consent state
		updateSessionConsent(consentState);

		if (debug) {
			console.log("[Analytics] Provider configured with:", {
				analyticsState,
				consentState,
			});
		}
	}, [
		analyticsState,
		consentState,
		defaultCurrency,
		debug,
		sessionTimeoutMinutes,
		batching,
	]);

	// Initialize analytics
	useEffect(() => {
		// Check if we should disable analytics based on environment
		const shouldDisable = !analyticsState.enabled || shouldDisableAnalytics();

		if (shouldDisable) {
			if (debug) {
				if (isWebContainer()) {
					console.log(
						"[Analytics] Analytics disabled in WebContainer environment",
					);
				} else {
					console.log(
						"[Analytics] Analytics disabled (no session context), skipping initialization",
					);
				}
			}
			return;
		}

		// GDPR Compliance: Always initialize analytics (legitimate interest)
		// Consent only controls cookie setting, not analytics data collection
		if (debug) {
			const consentStatus = consentState.hasUserInteracted
				? consentState.preferences.analytics
					? "granted"
					: "rejected"
				: "not-required";
			console.log(
				`[Analytics] Initializing analytics (consent: ${consentStatus}, cookies: ${consentState.preferences.analytics ? "enabled" : "disabled"})`,
			);
		}

		let mounted = true;

		async function initialize() {
			try {
				// Double-check WebContainer environment before making network requests
				if (isWebContainer()) {
					console.warn(
						"[Analytics] WebContainer detected, skipping analytics initialization",
					);
					return;
				}

				if (debug) {
					console.log(
						"[Analytics] Initializing analytics with state:",
						analyticsState,
					);
				}

				const success = await initializeAnalytics();
				if (mounted && success) {
					setSessionId(analyticsState.sessionId);
					setUserId(analyticsState.userId);
					setIsInitialized(true);

					if (debug) {
						console.log("[Analytics] Analytics initialized successfully:", {
							sessionId: analyticsState.sessionId,
							userId: analyticsState.userId,
							isAnonymous: analyticsState.isAnonymous,
						});
					}
				} else if (mounted) {
					console.warn(
						"[Analytics] Failed to initialize analytics - this is expected in development environments",
					);
				}
			} catch (error) {
				// Handle initialization errors gracefully
				if (mounted) {
					// Check if this is a network error (common in WebContainer)
					if (error instanceof TypeError && error.message.includes("fetch")) {
						console.warn(
							"[Analytics] Network request failed - analytics disabled (this is normal in WebContainer/development environments)",
						);
					} else if (error instanceof Error && error.message.includes("CORS")) {
						console.warn(
							"[Analytics] CORS error - analytics disabled (this is normal in development environments)",
						);
					} else {
						// Only log as error if it's an unexpected error
						console.warn("[Analytics] Failed to initialize analytics:", error);
					}
				}
			}
		}

		initialize();

		return () => {
			mounted = false;
		};
	}, [analyticsState, debug]); // Remove consentState from deps to prevent re-initialization

	// Session state updates when analytics state changes
	useEffect(() => {
		if (analyticsState.enabled && isInitialized) {
			setSessionId(analyticsState.sessionId);
			setUserId(analyticsState.userId);

			if (debug) {
				console.log("[Analytics] Session state updated:", {
					sessionId: analyticsState.sessionId,
					userId: analyticsState.userId,
					isAnonymous: analyticsState.isAnonymous,
				});
			}
		}
	}, [analyticsState, isInitialized, debug]);

	// Track event handler
	const handleTrackEvent = useCallback(
		async (params: TrackEventParams): Promise<boolean> => {
			if (!analyticsState.enabled) {
				if (debug) {
					console.log(
						"[Analytics] Event tracking disabled (no session context), skipping:",
						params,
					);
				}
				return false;
			}

			// GDPR Compliance: Always allow event tracking (legitimate interest)
			// Consent only controls cookie setting, not data collection
			if (!isInitialized) {
				if (debug) {
					console.warn(
						"[Analytics] Attempted to track event before initialization:",
						params,
					);
				}
				return false;
			}

			try {
				const success = await apiTrackEvent(params);
				return success;
			} catch (error) {
				console.error("[Analytics] Track event error:", error);
				return false;
			}
		},
		[analyticsState.enabled, isInitialized, debug],
	);

	// Setup default event tracking
	useEffect(() => {
		if (analyticsState.enabled && isInitialized) {
			if (debug) {
				console.log("[Analytics] Setting up event tracking...");
			}

			// Merge event configuration
			const eventConfig = mergeEventConfiguration({
				primaryGoal,
				customEvents,
				enableDefaultEvents,
			});

			if (debug) {
				console.log("[Analytics] Event configuration:", eventConfig);
			}

			const cleanup = setupDefaultEventTracking({
				trackEvent: handleTrackEvent,
				eventConfig,
				externalLinkBehavior,
				debug,
			});

			return cleanup;
		}
	}, [
		analyticsState.enabled,
		isInitialized,
		enableDefaultEvents,
		primaryGoal,
		customEvents,
		externalLinkBehavior,
		debug,
		handleTrackEvent,
	]);

	const contextValue = {
		trackEvent: handleTrackEvent,
		sessionId,
		userId,
		isInitialized,
		debug,
	};

	return (
		<AnalyticsContextProvider value={contextValue}>
			{children}
		</AnalyticsContextProvider>
	);
}
