import type {
	ABTestNode,
	AllCampaignNodes,
	SegmentNode,
	TrafficNode,
	VariantNode,
} from "@/components/canvas/campaign/nodes/campaign/types";
import type { Doc } from "@firebuzz/convex";
import { useNodes } from "@xyflow/react";
import { useMemo } from "react";
import { ABTestPanel } from "./panel/screens/abtest-panel";
import { CampaignOverviewPanel } from "./panel/screens/campaign-overview-panel";
import { SegmentPanel } from "./panel/screens/segment-panel";
import { TrafficPanel } from "./panel/screens/traffic-panel";
import { VariantPanel } from "./panel/screens/variant-panel";

interface PanelProps {
	campaign?: Doc<"campaigns">;
}

export const Panel = ({ campaign }: PanelProps) => {
	const nodes = useNodes<AllCampaignNodes>();
	const selectedNodes = useMemo(
		() => nodes.filter((node) => node.selected),
		[nodes],
	);

	const lastSelectedNode = useMemo(
		() => selectedNodes[selectedNodes.length - 1],
		[selectedNodes],
	);

	if (!lastSelectedNode) {
		if (campaign) {
			return <CampaignOverviewPanel campaign={campaign} />;
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
				/>
			);
		case "variant":
			return (
				<VariantPanel
					key={lastSelectedNode.id}
					node={lastSelectedNode as VariantNode}
				/>
			);

		default:
			return (
				<div className="p-4">
					<p className="text-muted-foreground">
						Unknown node type: {lastSelectedNode.type}
					</p>
				</div>
			);
	}
};
