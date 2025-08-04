"use client";
import { Canvas } from "@/components/canvas/campaign/canvas";
import { BaseNode } from "@/components/canvas/campaign/nodes/base-node";
import { ABTestNode } from "@/components/canvas/campaign/nodes/campaign/abtest-node";
import { SegmentNode } from "@/components/canvas/campaign/nodes/campaign/segment-node";
import { TrafficNode } from "@/components/canvas/campaign/nodes/campaign/traffic-node";
import { VariantNode } from "@/components/canvas/campaign/nodes/campaign/variant-node";
import { NoteNode } from "@/components/canvas/campaign/nodes/notes-node";

import type { Doc } from "@firebuzz/convex";

const nodeTypes = {
  base: BaseNode,
  note: NoteNode,
  traffic: TrafficNode,
  segment: SegmentNode,
  "ab-test": ABTestNode,
  variant: VariantNode,
};

export const CampaignCanvas = ({
  campaign,
}: {
  campaign: Doc<"campaigns">;
}) => {
  return (
    <div className="flex flex-1 h-full">
      <Canvas 
        campaignId={campaign._id}
        projectId={campaign.projectId}
        initialData={campaign.config} 
        nodeTypes={nodeTypes} 
      />
    </div>
  );
};
