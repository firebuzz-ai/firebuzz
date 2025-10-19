import { ConsentProvider } from "@firebuzz/consent-manager";
import { ViteReactSSG } from "vite-react-ssg/single-page";
import { AnalyticsBridge } from "./analytics-bridge.tsx";
import { App } from "./app.tsx";
import { CookieBanner } from "./components/cookie-banner/cookie-banner.tsx";
import { Toaster } from "./components/ui/sonner.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { campaignConfiguration } from "./configuration/campaign.ts";
import { tagsConfiguration } from "./configuration/tags.ts";
import { Head } from "./head.tsx";
import "./index.css";

// Load Design Mode overlay for element selection
import "./design-mode/overlay";


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
      debug={false} // Enable debug for development
    >
      <AnalyticsBridge
        customEvents={campaignConfiguration.customEvents}
        primaryGoal={campaignConfiguration.primaryGoal}
        debug={false}
      >
        <TooltipProvider>
          <Head />
          <App />
          <Toaster />
        </TooltipProvider>

        {/* Cookie Banner - shows when no consent given */}
        <CookieBanner  />
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
