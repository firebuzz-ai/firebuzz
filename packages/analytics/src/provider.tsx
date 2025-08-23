"use client";

import { useCallback, useEffect, useState } from "react";
import {
  trackEvent as apiTrackEvent,
  configureApiClient,
  initializeAnalytics,
} from "./api";
import { AnalyticsContextProvider } from "./context";
import { getAllCookieData, getUserId, getValidSessionId } from "./cookies";
import { setupDefaultEventTracking } from "./tracking/default-events";
import type { AnalyticsProviderProps, TrackEventParams } from "./types";

/**
 * Analytics Provider Component
 */
export function AnalyticsProvider({
  apiUrl,
  campaignId,
  workspaceId,
  projectId,
  landingPageId,
  customEvents = [],
  cookiePrefix = "frbzz_",
  enableDefaultEvents = true,
  enabled = true,
  debug = false,
  children,
}: AnalyticsProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Configure API client
  useEffect(() => {
    if (!enabled) {
      if (debug) {
        console.log("[Analytics] Analytics disabled, skipping configuration");
      }
      return;
    }

    configureApiClient({
      apiUrl,
      campaignId,
      workspaceId,
      projectId,
      landingPageId,
      debug,
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
    workspaceId,
    projectId,
    landingPageId,
    debug,
    enabled,
  ]);

  // Initialize analytics
  useEffect(() => {
    if (!enabled) {
      if (debug) {
        console.log("[Analytics] Analytics disabled, skipping initialization");
      }
      return;
    }

    let mounted = true;

    async function initialize() {
      try {
        if (debug) {
          console.log("[Analytics] Initializing analytics...");
        }

        // Try to get existing session
        const existingSessionId = getValidSessionId(campaignId);
        const existingUserId = getUserId(campaignId);

        if (existingSessionId && existingUserId) {
          if (debug) {
            console.log(
              "[Analytics] Found existing valid session:",
              existingSessionId
            );
          }
          if (mounted) {
            setSessionId(existingSessionId);
            setUserId(existingUserId);
            setIsInitialized(true);
          }
        } else {
          // Initialize new session
          if (debug) {
            console.log("[Analytics] No valid session found, initializing...");
          }
          const success = await initializeAnalytics();
          if (mounted && success) {
            const newSessionId = getValidSessionId(campaignId);
            const newUserId = getUserId(campaignId);
            setSessionId(newSessionId);
            setUserId(newUserId);
            setIsInitialized(true);

            if (debug) {
              console.log("[Analytics] Analytics initialized successfully:", {
                newSessionId,
                newUserId,
              });
            }
          } else if (mounted) {
            console.error("[Analytics] Failed to initialize analytics");
          }
        }
      } catch (error) {
        console.error("[Analytics] Initialization error:", error);
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [campaignId, debug, enabled]);

  // Setup default event tracking
  useEffect(() => {
    if (enabled && isInitialized && enableDefaultEvents) {
      if (debug) {
        console.log("[Analytics] Setting up default event tracking...");
      }

      const cleanup = setupDefaultEventTracking({
        trackEvent: handleTrackEvent,
        debug,
      });

      return cleanup;
    }
  }, [enabled, isInitialized, enableDefaultEvents, debug]);

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
            params
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
    [enabled, isInitialized, sessionId, campaignId, debug]
  );

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
