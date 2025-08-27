"use client";

import { useCallback, useEffect, useState } from "react";
import {
	trackEvent as apiTrackEvent,
	configureApiClient,
	initializeAnalytics,
} from "./api";
import { AnalyticsContextProvider } from "./context";
import {
	disableTestMode,
	enableTestMode,
	getAllCookieData,
	getUserId,
	getValidSessionId,
} from "./cookies";
import { mergeEventConfiguration } from "./event-config";
import { setupDefaultEventTracking } from "./tracking/default-events";
import type { AnalyticsProviderProps, TrackEventParams } from "./types";
import { isWebContainer, shouldDisableAnalytics } from "./utils/environment";

/**
 * Analytics Provider Component
 */
export function AnalyticsProvider({
	apiUrl,
	campaignId,
	campaignSlug,
	workspaceId,
	projectId,
	landingPageId,
	customEvents = [],
	primaryGoal,
	defaultCurrency = "USD",
	enableDefaultEvents = true,
	enabled = true,
	debug = false,
	testMode = false,
	batching,
	externalLinkBehavior,
	sessionTimeoutMinutes,
	mockCookieData,
	children,
}: AnalyticsProviderProps) {
	const [isInitialized, setIsInitialized] = useState(false);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [userId, setUserId] = useState<string | null>(null);

	// Setup test mode
	useEffect(() => {
		if (testMode) {
			enableTestMode(mockCookieData);
			if (debug) {
				console.log(
					"[Analytics] Test mode enabled with mock data:",
					mockCookieData,
				);
			}
		}

		return () => {
			if (testMode) {
				disableTestMode();
			}
		};
	}, [testMode, mockCookieData, debug]);

	// Configure API client
	useEffect(() => {
		// Check if we should disable analytics based on environment
		const shouldDisable = !enabled || shouldDisableAnalytics();

		if (shouldDisable) {
			if (debug) {
				if (isWebContainer()) {
					console.log(
						"[Analytics] Analytics disabled in WebContainer environment",
					);
				} else {
					console.log("[Analytics] Analytics disabled, skipping configuration");
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
			apiUrl,
			campaignId,
			campaignSlug,
			workspaceId,
			projectId,
			landingPageId,
			defaultCurrency,
			debug,
			sessionTimeoutMinutes,
			batching: batchingConfig,
		});

		if (debug) {
			console.log("[Analytics] Provider configured with:", {
				apiUrl,
				campaignId,
				workspaceId,
				projectId,
				landingPageId,
				cookieData: getAllCookieData(campaignId),
			});
		}
	}, [
		apiUrl,
		campaignId,
		campaignSlug,
		workspaceId,
		projectId,
		landingPageId,
		defaultCurrency,
		debug,
		enabled,
		sessionTimeoutMinutes,
		batching,
	]);

	// Initialize analytics
	useEffect(() => {
		// Check if we should disable analytics based on environment
		const shouldDisable = !enabled || shouldDisableAnalytics();

		if (shouldDisable) {
			if (debug) {
				if (isWebContainer()) {
					console.log(
						"[Analytics] Analytics disabled in WebContainer environment",
					);
				} else {
					console.log(
						"[Analytics] Analytics disabled, skipping initialization",
					);
				}
			}
			return;
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
					console.log("[Analytics] Initializing analytics...");
				}

				// Try to get existing session
				const existingSessionId = getValidSessionId(campaignId);
				const existingUserId = getUserId(campaignId);

				// Always call initializeAnalytics to ensure the server-side session is properly initialized
				if (debug) {
					if (existingSessionId && existingUserId) {
						console.log(
							"[Analytics] Found existing valid session, re-initializing server:",
							existingSessionId,
						);
					} else {
						console.log("[Analytics] No valid session found, initializing...");
					}
				}

				const success = await initializeAnalytics();
				if (mounted && success) {
					const sessionId = getValidSessionId(campaignId);
					const userId = getUserId(campaignId);
					setSessionId(sessionId);
					setUserId(userId);
					setIsInitialized(true);

					if (debug) {
						console.log("[Analytics] Analytics initialized successfully:", {
							sessionId,
							userId,
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
	}, [campaignId, debug, enabled]);

	// Proactive session validation - check every 5 minutes
	useEffect(() => {
		if (!enabled || !isInitialized) return;

		const checkSession = async () => {
			const currentSessionId = getValidSessionId(campaignId);
			if (!currentSessionId && getUserId(campaignId)) {
				// Session expired but user exists, reinitialize
				if (debug) {
					console.log("[Analytics] Session expired, reinitializing...");
				}
				try {
					const success = await initializeAnalytics();
					if (success) {
						const newSessionId = getValidSessionId(campaignId);
						setSessionId(newSessionId);
						if (debug) {
							console.log(
								"[Analytics] Session renewed proactively:",
								newSessionId,
							);
						}
					}
				} catch (error) {
					console.error("[Analytics] Proactive session renewal failed:", error);
				}
			}
		};

		// Check immediately and then every 5 minutes
		checkSession();
		const interval = setInterval(checkSession, 5 * 60 * 1000); // 5 minutes

		return () => clearInterval(interval);
	}, [campaignId, debug, enabled, isInitialized]);

	// Track event handler
	const handleTrackEvent = useCallback(
		async (params: TrackEventParams): Promise<boolean> => {
			if (!enabled) {
				if (debug) {
					console.log("[Analytics] Event tracking disabled, skipping:", params);
				}
				return false;
			}

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

				// Update session ID in case it was renewed
				const currentSessionId = getValidSessionId(campaignId);
				if (currentSessionId && currentSessionId !== sessionId) {
					setSessionId(currentSessionId);
					if (debug) {
						console.log("[Analytics] Session renewed:", currentSessionId);
					}
				}

				return success;
			} catch (error) {
				console.error("[Analytics] Track event error:", error);
				return false;
			}
		},
		[enabled, isInitialized, sessionId, campaignId, debug],
	);

	// Setup default event tracking
	useEffect(() => {
		if (enabled && isInitialized) {
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
		enabled,
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
