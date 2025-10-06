import { AgentSessionProvider } from "@/components/providers/agent/session";
import { SanboxProvider } from "@/components/providers/agent/sandbox";
import type { Id } from "@firebuzz/convex/nextjs";
import { EditLandingPage } from "./_components/edit";

export default async function Page({
  params,
}: {
  params: Promise<{ campaignId: Id<"campaigns">; pageId: Id<"landingPages"> }>;
}) {
  const { campaignId, pageId } = await params;

  return (
    <>
      <AgentSessionProvider
        campaignId={campaignId}
        type="landingPage"
        landingPageId={pageId}
      >
        <SanboxProvider>
          <EditLandingPage />
        </SanboxProvider>
      </AgentSessionProvider>
    </>
  );
}
