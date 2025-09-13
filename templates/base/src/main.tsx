import { ConsentProvider } from "@firebuzz/consent-manager";
import { ViteReactSSG } from "vite-react-ssg/single-page";
import { AnalyticsBridge } from "./analytics-bridge.tsx";
import { App } from "./app.tsx";
import { CookieBanner } from "./components/cookie-banner/cookie-banner.tsx";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { campaignConfiguration } from "./configuration/campaign.ts";
import { tagsConfiguration } from "./configuration/tags.ts";
import { Head } from "./head";
import "./index.css";

// Templates should NOT create mock session context to prevent unwanted API calls
// Only pass through real server-injected session context if it exists
if (typeof window !== "undefined") {
  // Check if server already injected real session context
  const existingContext = (window as any).__FIREBUZZ_SESSION_CONTEXT__;

  // Only keep real session context, don't create mock data
  if (!existingContext || !existingContext.apiBaseUrl) {
    // No real session context - this means we're in template/dev mode
    // Don't set any session context so packages will be disabled
    console.log(
      "[Template] No real session context - analytics and consent API calls disabled"
    );
    // Clear any existing mock context
    delete (window as any).__FIREBUZZ_SESSION_CONTEXT__;
  } else {
    console.log("[Template] Real session context detected - analytics enabled");
  }
}

export const createRoot = ViteReactSSG(
  <>
    {/* Tag Manager Script Directly after Body Opening Tag */}
    {tagsConfiguration.googleTagManagerId && (
      <noscript>
        <iframe
          title="Google Tag Manager Noscript"
          src={`https://www.googletagmanager.com/ns.html?id=${tagsConfiguration.googleTagManagerId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    )}

    <ConsentProvider
      translations={{
        language: "en",
      }}
      // Note: sessionContext, workspaceId, projectId, campaignId, workerEndpoint
      // are now automatically extracted from window.__FIREBUZZ_SESSION_CONTEXT__
      // No enabled flag needed - presence of session context determines enablement
      gtm={{
        consentDefaults: {
          analytics_storage: "denied",
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
          functionality_storage: "denied",
          personalization_storage: "denied",
          security_storage: "granted",
        },
      }}
      debug={true} // Enable debug for development
    >
      <AnalyticsBridge
        // Note: enabled, apiUrl, campaignId, workspaceId, projectId, landingPageId
        // are now automatically extracted from window.__FIREBUZZ_SESSION_CONTEXT__
        // No enabled flag needed - presence of session context determines enablement
        customEvents={campaignConfiguration.customEvents}
        primaryGoal={campaignConfiguration.primaryGoal}
      >
        <TooltipProvider>
          <Head />
          <App />
          <Toaster />
        </TooltipProvider>

        {/* Cookie Banner - shows when no consent given */}
        <CookieBanner privacyPolicyUrl="/privacy-policy" />
      </AnalyticsBridge>
    </ConsentProvider>

    {/* Facebook Pixel Tag */}
    {tagsConfiguration.facebookPixelId && (
      <noscript>
        <img
          alt="Facebook Pixel"
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${tagsConfiguration.facebookPixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    )}
  </>,
  async () => {},
  {
    registerComponents: true,
  }
);
