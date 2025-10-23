"use client";

import type { AnalyticsProviderProps } from "@firebuzz/analytics";
import { AnalyticsProvider } from "@firebuzz/analytics";
import { useConsent } from "@firebuzz/consent-manager";

interface AnalyticsBridgeProps
  extends Omit<AnalyticsProviderProps, "consentState"> {
  children: React.ReactNode;
}

/**
 * Bridge component that connects analytics with consent manager.
 * Session data is now automatically extracted from window.__FIREBUZZ_SESSION_CONTEXT__
 * which is injected by the engine. All session data (workspace, project, campaign IDs,
 * API URL, etc.) are extracted from session context automatically.
 *
 * Templates should copy this component and customize as needed.
 *
 * Usage:
 * ```tsx
 * <AnalyticsBridge
 *   primaryGoal={{ event_id: "conversion", event_type: "conversion", event_value: 100, event_value_type: "static", isCustom: false }}
 * >
 *   <YourApp />
 * </AnalyticsBridge>
 * ```
 */
export function AnalyticsBridge({ children, ...props }: AnalyticsBridgeProps) {
  const { consentState } = useConsent();

  // During SSR or when no consent state, use default disabled state
  const effectiveConsentState = consentState || {
    analytics: false,
    functional: false,
    marketing: false,
  };

  const analyticsProps = {
    ...props,
    consentState: effectiveConsentState,
    children,
  } satisfies AnalyticsProviderProps;

  return <AnalyticsProvider {...analyticsProps} />;
}
