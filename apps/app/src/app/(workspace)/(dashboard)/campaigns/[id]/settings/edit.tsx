"use client";
import { FlowLayout } from "@/components/layouts/two-panels/panels/campaign/flow";
import { PanelLayout } from "@/components/layouts/two-panels/panels/campaign/panel";
import { useNodes } from "@xyflow/react";
import { CampaignCanvas } from "./canvas";

export function EditCampaign() {
  const nodes = useNodes();
  const selectedNodes = nodes.filter((node) => node.selected);
  return (
    <>
      <FlowLayout>
        <CampaignCanvas />
      </FlowLayout>
      <PanelLayout>
        <div>{JSON.stringify(selectedNodes)}</div>
      </PanelLayout>
    </>
  );
}
