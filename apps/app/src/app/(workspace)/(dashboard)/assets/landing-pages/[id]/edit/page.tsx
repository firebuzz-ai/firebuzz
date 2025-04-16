import { LandingPageSettingsSheet } from "@/components/sheets/settings/landing-page/sheet";
import { auth } from "@clerk/nextjs/server";
import type { Id } from "@firebuzz/convex/nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EditLandingPage } from "./_components/edit";
import { Providers } from "./_components/providers";
export default async function LandingPageEditPage({
  params,
}: {
  params: Promise<{ id: Id<"landingPages"> }>;
}) {
  const token = await (await auth()).getToken({ template: "convex" });

  if (!token) {
    redirect("/");
  }
  const { id } = await params;
  const panelId = "landing-page-chat";
  const cookieStore = await cookies();
  const previewPanelValue = cookieStore.get(
    `${panelId}-right-panel-size`
  )?.value;
  const previewPanelSize = previewPanelValue
    ? Number.parseInt(previewPanelValue)
    : 30;

  return (
    <Providers previewPanelSize={previewPanelSize} panelId={panelId}>
      <EditLandingPage id={id} />
      {/* Sheets */}
      <LandingPageSettingsSheet landingPageId={id} />
    </Providers>
  );
}
