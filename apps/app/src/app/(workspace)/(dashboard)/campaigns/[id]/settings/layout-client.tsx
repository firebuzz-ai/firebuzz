"use client";
import { CanvasProvider } from "@/components/canvas/provider";
import { TwoPanelsProvider } from "@/components/layouts/two-panels/provider";

export default function EditCampaignPage({
  children,
  rightPanelSize,
  id,
}: {
  children: React.ReactNode;
  rightPanelSize: number;
  id: string;
}) {
  return (
    <TwoPanelsProvider
      rightPanelSizeFromCookie={rightPanelSize}
      id={id}
      isRightPanelClosable={false}
    >
      <CanvasProvider>{children}</CanvasProvider>
    </TwoPanelsProvider>
  );
}
