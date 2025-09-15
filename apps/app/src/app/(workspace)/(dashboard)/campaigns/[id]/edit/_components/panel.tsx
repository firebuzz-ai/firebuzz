import type {
	ABTestNode,
	AllCampaignNodes,
	SegmentNode,
	TrafficNode,
	VariantNode,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { useCampaignNavigation } from "@/hooks/ui/use-campaign-navigation";
import type { Doc } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useNodes } from "@xyflow/react";
import { useMemo, useState } from "react";
import { ABTestPanel } from "./panel/screens/abtest-panel";
import { CampaignOverviewPanel } from "./panel/screens/campaign-overview-panel";
import { CustomEventsPanel } from "./panel/screens/custom-events-panel";
import { GdprAdvancedSettings } from "./panel/screens/gdpr-advanced-settings";
import { SegmentPanel } from "./panel/screens/segment-panel";
import { TrafficPanel } from "./panel/screens/traffic-panel";
import { VariantPanel } from "./panel/screens/variant-panel";

interface PanelProps {
	campaign?: Doc<"campaigns">;
}

export const Panel = ({ campaign }: PanelProps) => {
	const nodes = useNodes<AllCampaignNodes>();
	const [{ screen }, setNavigationState] = useCampaignNavigation();
	const [editEventId, setEditEventId] = useState<string | undefined>(undefined);

	const selectedNodes = useMemo(
		() => nodes.filter((node) => node.selected),
		[nodes],
	);

	const lastSelectedNode = useMemo(
		() => selectedNodes[selectedNodes.length - 1],
		[selectedNodes],
	);

	if (!campaign || nodes.length === 0) {
		return (
			<div className="flex justify-center items-center w-full h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	if (!lastSelectedNode || selectedNodes.length === 0) {
		// No node selected - use URL screen state for panel navigation
		switch (screen) {
			case "custom-events":
				return (
					<CustomEventsPanel
						campaign={campaign}
						onBackToCampaignOverview={() => {
							setEditEventId(undefined);
							setNavigationState({ screen: "overview" });
						}}
						editEventId={editEventId}
					/>
				);

			case "gdpr-settings":
				return (
					<GdprAdvancedSettings
						campaign={campaign}
						gdprSettings={
							campaign.campaignSettings?.gdpr || {
								enabled: true,
								geoLocation: true,
								localization: true,
								includedCountries: [],
								respectDNT: true,
							}
						}
						onGdprChange={() => {}}
						onBack={() => {
							setNavigationState({ screen: "overview" });
						}}
					/>
				);

			default:
				return (
					<CampaignOverviewPanel
						campaign={campaign}
						onNavigateToCustomEvents={(eventId) => {
							setEditEventId(eventId);
							setNavigationState({ screen: "custom-events" });
						}}
						onNavigateToGdprSettings={() => {
							setNavigationState({ screen: "gdpr-settings" });
						}}
					/>
				);
		}
	}

	// Handle different node types - use the actual node type, not screen state
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
						setEditEventId(undefined);
						setNavigationState({ screen: "overview" });
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
					onNavigateToCustomEvents={(eventId) => {
						setEditEventId(eventId);
						setNavigationState({ screen: "custom-events" });
					}}
					onNavigateToGdprSettings={() => {
						setNavigationState({ screen: "gdpr-settings" });
					}}
				/>
			);
	}
};
