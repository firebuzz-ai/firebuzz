/**
 * Hook to detect the current campaign environment.
 *
 * @returns 'dev' | 'preview' | 'production' - The current campaign environment
 *
 * When session context is available (real Firebuzz environment):
 * - Returns the actual campaign environment from session context
 *
 * When no session context (template/development):
 * - Returns 'dev' to indicate local development environment
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const env = useCampaignEnv();
 *
 *   if (env === 'dev') {
 *     // Template/development mode
 *   } else {
 *     // Real Firebuzz environment (preview/production)
 *   }
 * }
 * ```
 */
export const useCampaignEnv = (): "dev" | "preview" | "production" => {
  // Check if we have session context by looking at window global
  // (consentState being null doesn't necessarily mean no session context)
  const sessionContext =
    typeof window !== "undefined"
      ? (window as any).__FIREBUZZ_SESSION_CONTEXT__
      : null;

  // If we have session context, return the campaign environment
  if (sessionContext?.campaignEnvironment) {
    return sessionContext.campaignEnvironment;
  }

  // No session context means we're in template/development mode
  return "dev";
};