"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  trackEvent as apiTrackEvent,
  configureApiClient,
  initializeAnalytics,
  setSessionData,
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
  apiUrl,
  sessionData,
  consentState,
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
  batching,
  externalLinkBehavior,
  sessionTimeoutMinutes,
  children,
}: AnalyticsProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Determine analytics state based on session data and consent
  const analyticsState = useMemo(() => {
    // If no consent to track or no session data, use temporary IDs
    if (!consentState.shouldTrack || !sessionData) {
      return {
        userId: `anon-${generateUniqueId()}`,
        sessionId: `anon-${generateUniqueId()}`,
        campaignId: sessionData?.campaignId || "unknown",
        isAnonymous: true,
        isTestMode: false,
      };
    }

    // Use real session data
    return {
      userId: sessionData.userId,
      sessionId: sessionData.sessionId,
      campaignId: sessionData.campaignId,
      isAnonymous: false,
      isTestMode: false,
    };
  }, [consentState, sessionData]);

  // Set session data in API module
  useEffect(() => {
    if (analyticsState && enabled) {
      setSessionData({
        userId: analyticsState.userId,
        sessionId: analyticsState.sessionId,
        campaignId: analyticsState.campaignId,
      });
    }
  }, [analyticsState, enabled]);

  // Configure API client
  useEffect(() => {
    // Check if we should disable analytics based on environment
    const shouldDisable = !enabled || shouldDisableAnalytics();

    if (shouldDisable) {
      if (debug) {
        if (isWebContainer()) {
          console.log(
            "[Analytics] Analytics disabled in WebContainer environment"
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
      campaignId: analyticsState.campaignId,
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
        analyticsState,
        consentState,
        workspaceId,
        projectId,
        landingPageId,
      });
    }
  }, [
    apiUrl,
    analyticsState,
    consentState,
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
            "[Analytics] Analytics disabled in WebContainer environment"
          );
        } else {
          console.log(
            "[Analytics] Analytics disabled, skipping initialization"
          );
        }
      }
      return;
    }

    // Don't initialize if no consent to track
    if (!consentState.shouldTrack) {
      if (debug) {
        console.log("[Analytics] No consent to track, skipping initialization");
      }
      return;
    }

    let mounted = true;

    async function initialize() {
      try {
        // Double-check WebContainer environment before making network requests
        if (isWebContainer()) {
          console.warn(
            "[Analytics] WebContainer detected, skipping analytics initialization"
          );
          return;
        }

        if (debug) {
          console.log(
            "[Analytics] Initializing analytics with state:",
            analyticsState
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
            "[Analytics] Failed to initialize analytics - this is expected in development environments"
          );
        }
      } catch (error) {
        // Handle initialization errors gracefully
        if (mounted) {
          // Check if this is a network error (common in WebContainer)
          if (error instanceof TypeError && error.message.includes("fetch")) {
            console.warn(
              "[Analytics] Network request failed - analytics disabled (this is normal in WebContainer/development environments)"
            );
          } else if (error instanceof Error && error.message.includes("CORS")) {
            console.warn(
              "[Analytics] CORS error - analytics disabled (this is normal in development environments)"
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
  }, [analyticsState, consentState, debug, enabled]);

  // Session state updates when analytics state changes
  useEffect(() => {
    if (enabled && isInitialized) {
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
  }, [analyticsState, enabled, isInitialized, debug]);

  // Track event handler
  const handleTrackEvent = useCallback(
    async (params: TrackEventParams): Promise<boolean> => {
      if (!enabled) {
        if (debug) {
          console.log("[Analytics] Event tracking disabled, skipping:", params);
        }
        return false;
      }

      // Check consent before tracking
      if (!consentState.analytics) {
        if (debug) {
          console.log(
            "[Analytics] Event blocked - no analytics consent:",
            params
          );
        }
        return false;
      }

      if (!isInitialized) {
        if (debug) {
          console.warn(
            "[Analytics] Attempted to track event before initialization:",
            params
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
    [enabled, consentState.analytics, isInitialized, debug]
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
