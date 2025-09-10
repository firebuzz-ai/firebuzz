"use client";

import { AnalyticsProvider } from "@firebuzz/analytics";
import { useConsent, useSessionContext } from "@firebuzz/consent-manager";
import type { AnalyticsProviderProps } from "@firebuzz/analytics";

interface AnalyticsBridgeProps extends Omit<AnalyticsProviderProps, "sessionData" | "consentState"> {
  children: React.ReactNode;
}

/**
 * Bridge component that connects analytics with consent and session context.
 * This component automatically provides session data and consent state to the analytics provider.
 * 
 * Templates should copy this component and customize as needed.
 * 
 * Usage:
 * ```tsx
 * <AnalyticsBridge
 *   apiUrl="https://engine.firebuzz.com"
 *   workspaceId="workspace_123"
 *   projectId="project_456"
 *   primaryGoal={{ event_id: "conversion", event_type: "conversion", event_value: 100, event_value_type: "static", isCustom: false }}
 * >
 *   <YourApp />
 * </AnalyticsBridge>
 * ```
 */
export function AnalyticsBridge({
  children,
  ...props
}: AnalyticsBridgeProps) {
  const { sessionContext } = useSessionContext();
  const { consentState } = useConsent();

  // Don't render until we have session context and consent state
  if (!sessionContext || !consentState) {
    return <>{children}</>;
  }

  // Extract session data from session context
  const sessionData = {
    userId: sessionContext.session.userId,
    sessionId: sessionContext.session.sessionId,
    campaignId: sessionContext.session.campaignId,
    landingPageId: sessionContext.session.landingPageId,
    abTestId: sessionContext.session.abTestId,
    abTestVariantId: sessionContext.session.abTestVariantId,
  };

  return (
    <AnalyticsProvider
      sessionData={sessionData}
      consentState={consentState}
      {...props}
    >
      {children}
    </AnalyticsProvider>
  );
}