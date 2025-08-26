import { AnalyticsProvider } from "@firebuzz/analytics";
import { ViteReactSSG } from "vite-react-ssg/single-page";
import { App } from "./app.tsx";
import { Toaster } from "./components/ui/sonner.tsx";
import { campaignConfiguration } from "./configuration/campaign.ts";
import { tagsConfiguration } from "./configuration/tags.ts";
import { Head } from "./head.tsx";
import "./index.css";

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
    <AnalyticsProvider
      enabled={campaignConfiguration.analyticsEnabled}
      apiUrl={campaignConfiguration.apiUrl.split("/client-api")[0]}
      campaignId={campaignConfiguration.campaignId}
      workspaceId={campaignConfiguration.workspaceId}
      projectId={campaignConfiguration.projectId}
      landingPageId={campaignConfiguration.landingPageId}
      debug={true}
      customEvents={campaignConfiguration.customEvents}
      primaryGoal={campaignConfiguration.primaryGoal}
    >
      <Head />
      <App />
      <Toaster />
    </AnalyticsProvider>
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
