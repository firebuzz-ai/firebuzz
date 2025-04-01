"use client";
import { Background } from "@/components/canvas/background";
import { Canvas } from "@/components/canvas/canvas";
import { Controller } from "@/components/canvas/controller";
import { BaseNode } from "@/components/canvas/nodes/base-node";
import { ABTestNode } from "@/components/canvas/nodes/campaign/abtest-node";
import { AdvancedTargetingNode } from "@/components/canvas/nodes/campaign/advanced-targeting-node";
import { SegmentNode } from "@/components/canvas/nodes/campaign/segment-node";
import { TrafficNode } from "@/components/canvas/nodes/campaign/traffic-node";
import { VariantNode } from "@/components/canvas/nodes/campaign/variant-node";
import { NoteNode } from "@/components/canvas/nodes/notes-node";
import { PlaceholderNode } from "@/components/canvas/nodes/placeholder-node";
import { type Doc, api, useMutation } from "@firebuzz/convex";
import type { Edge, Node } from "@xyflow/react";
import { useCallback } from "react";

const nodeTypes = {
  base: BaseNode,
  placeholder: PlaceholderNode,
  note: NoteNode,
  traffic: TrafficNode,
  segment: SegmentNode,
  "advanced-targeting": AdvancedTargetingNode,
  "ab-test": ABTestNode,
  variant: VariantNode,
};

export const CampaignCanvas = ({
  campaign,
}: {
  campaign: Doc<"campaigns">;
}) => {
  const updateCampaign = useMutation(
    api.collections.campaigns.mutations.update
  );

  const onSaveHandler = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      updateCampaign({
        id: campaign._id,
        projectId: campaign.projectId,
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
          dragging: node.dragging,
          selected: node.selected,
          parentId: node.parentId,
          dragHandle: node.dragHandle,
          measured: node.measured,
          width: node.width,
          height: node.height,
          initialWidth: node.initialWidth,
          initialHeight: node.initialHeight,
          zIndex: node.zIndex,
          handles: node.handles,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          animated: edge.animated,
          selected: edge.selected,
          data: edge.data,
        })),
      });
    },
    [campaign._id, updateCampaign, campaign.projectId]
  );

  return (
    <div className="flex flex-1 h-full">
      <Canvas
        initialNodes={campaign.nodes}
        initialEdges={campaign.edges}
        nodeTypes={nodeTypes}
        onSaveHandler={onSaveHandler}
      >
        <Background />
        <Controller />
      </Canvas>
    </div>
  );
};
