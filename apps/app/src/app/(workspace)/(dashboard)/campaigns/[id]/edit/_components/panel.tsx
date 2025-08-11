import type {
  ABTestNode,
  AllCampaignNodes,
  SegmentNode,
  TrafficNode,
  VariantNode,
} from "@/components/canvas/campaign/nodes/campaign/types";
import type { Doc } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useNodes } from "@xyflow/react";
import { useMemo, useState } from "react";
import { ABTestPanel } from "./panel/screens/abtest-panel";
import { CampaignOverviewPanel } from "./panel/screens/campaign-overview-panel";
import { CustomGoalsPanel } from "./panel/screens/custom-goals-panel";
import { SegmentPanel } from "./panel/screens/segment-panel";
import { TrafficPanel } from "./panel/screens/traffic-panel";
import { VariantPanel } from "./panel/screens/variant-panel";

interface PanelProps {
  campaign?: Doc<"campaigns">;
}

export const Panel = ({ campaign }: PanelProps) => {
  const nodes = useNodes<AllCampaignNodes>();
  const [currentPanel, setCurrentPanel] = useState<"overview" | "custom-goals">(
    "overview"
  );
  const [editGoalId, setEditGoalId] = useState<string | undefined>(undefined);

  const selectedNodes = useMemo(
    () => nodes.filter((node) => node.selected),
    [nodes]
  );

  const lastSelectedNode = useMemo(
    () => selectedNodes[selectedNodes.length - 1],
    [selectedNodes]
  );

  if (!campaign || nodes.length === 0) {
    return (
      <div className="flex justify-center items-center w-full h-full">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!lastSelectedNode) {
    if (campaign) {
      // Handle panel navigation when no node is selected (campaign overview mode)
      switch (currentPanel) {
        case "custom-goals":
          return (
            <CustomGoalsPanel
              campaign={campaign}
              onBackToCampaignOverview={() => {
                setCurrentPanel("overview");
                setEditGoalId(undefined);
              }}
              editGoalId={editGoalId}
            />
          );

        default:
          return (
            <CampaignOverviewPanel
              campaign={campaign}
              onNavigateToCustomGoals={(goalId) => {
                setEditGoalId(goalId);
                setCurrentPanel("custom-goals");
              }}
            />
          );
      }
    }
    return (
      <div className="flex flex-col gap-2 p-4">
        <p className="text-muted-foreground">No node selected</p>
        <p className="text-sm text-muted-foreground">
          Select a node to view its configuration
        </p>
      </div>
    );
  }

  // Handle different node types
  switch (lastSelectedNode.type) {
    case "traffic":
      return (
        <TrafficPanel
          key={lastSelectedNode.id}
          node={lastSelectedNode as TrafficNode}
          campaign={campaign}
        />
      );
    case "segment":
      return (
        <SegmentPanel
          key={lastSelectedNode.id}
          node={lastSelectedNode as SegmentNode}
          campaign={campaign}
        />
      );
    case "ab-test":
      return (
        <ABTestPanel
          key={lastSelectedNode.id}
          node={lastSelectedNode as ABTestNode}
          campaign={campaign}
          onNavigateToCampaignOverview={() => {
            setCurrentPanel("overview");
            setEditGoalId(undefined);
          }}
        />
      );
    case "variant":
      return (
        <VariantPanel
          key={lastSelectedNode.id}
          node={lastSelectedNode as VariantNode}
          campaign={campaign}
        />
      );

    default:
      return (
        <CampaignOverviewPanel
          campaign={campaign}
          onNavigateToCustomGoals={(goalId) => {
            setEditGoalId(goalId);
            setCurrentPanel("custom-goals");
          }}
        />
      );
  }
};
