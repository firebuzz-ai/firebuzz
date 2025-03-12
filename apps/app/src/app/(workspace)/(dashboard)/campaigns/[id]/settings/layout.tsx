import { cookies } from "next/headers";
import LayoutClient from "./layout-client";

export default async function CampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const id = "campaign-flow";
  const cookieStore = await cookies();
  const rightPanelSizeValue = cookieStore.get(`${id}-right-panel-size`)?.value;
  const rightPanelSize = rightPanelSizeValue
    ? Number.parseInt(rightPanelSizeValue)
    : 30;
  return (
    <LayoutClient id={id} rightPanelSize={rightPanelSize}>
      {children}
    </LayoutClient>
  );
}
