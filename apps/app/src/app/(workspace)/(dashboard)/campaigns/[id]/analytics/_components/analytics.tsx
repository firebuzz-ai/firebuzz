"use client";

import { AnalyticsControlBar } from "@/components/analytics/controls/analytics-control-bar";
import { MismatchState, UnpublishedState } from "@/components/analytics/states";
import {
	type AnalyticsScreen,
	useCampaignAnalytics,
} from "@/hooks/state/use-campaign-analytics";
import type { Id } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { AnalyticsSidebar } from "./analytics-sidebar";
import { CampaignAnalyticsAudience } from "./screens/audience";
import { CampaignAnalyticsConversions } from "./screens/conversions";
import { CampaignAnalyticsOverview } from "./screens/overview";
import { CampaignAnalyticsRealtime } from "./screens/realtime";

const renderScreen = (currentScreen: AnalyticsScreen, id: Id<"campaigns">) => {
	switch (currentScreen) {
		case "overview":
			return <CampaignAnalyticsOverview campaignId={id as Id<"campaigns">} />;
		case "realtime":
			return <CampaignAnalyticsRealtime campaignId={id as Id<"campaigns">} />;
		case "audience":
			return <CampaignAnalyticsAudience campaignId={id as Id<"campaigns">} />;
		case "conversions":
			return (
				<CampaignAnalyticsConversions campaignId={id as Id<"campaigns">} />
			);
		case "ab-tests":
			return <div className="p-6">A/B Tests Screen (Coming Soon)</div>;
		default:
			return <CampaignAnalyticsOverview campaignId={id as Id<"campaigns">} />;
	}
};

interface AnalyticsProps {
	id: string;
}

export const Analytics = ({ id }: AnalyticsProps) => {
	const {
		screen: currentScreen,
		campaign,
		isCampaignLoading,
		isPreview,
	} = useCampaignAnalytics({
		campaignId: id as Id<"campaigns">,
	});

	// Check if we can show analytics data
	const canShowAnalytics = !!(
		campaign?.status === "published" ||
		campaign?.status === "preview" ||
		campaign?.status === "completed"
	);

	// Check for preview/production data mismatch
	const isPreviewProductionMismatch = !!(
		campaign?.status === "preview" && !isPreview
	);

	// Show loading state
	if (isCampaignLoading) {
		return (
			<div className="flex justify-center items-center w-full h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	// Show unpublished state
	if (!canShowAnalytics) {
		return (
			<div className="flex w-full h-full">
				<div className="flex overflow-hidden flex-col flex-1 px-6 pt-6">
					<UnpublishedState
						title="No Data Collected Yet"
						description="Please preview or publish your campaign to view analytics data."
					/>
				</div>
			</div>
		);
	}

	// Show preview/production mismatch state
	if (isPreviewProductionMismatch) {
		return (
			<div className="flex w-full h-full">
				<div className="flex overflow-hidden flex-col flex-1 px-6 pt-6">
					<AnalyticsControlBar campaignId={id as Id<"campaigns">} />
					<MismatchState
						title="No Production Data Available"
						description="This campaign is in preview mode. Switch to preview data or publish your campaign to view production analytics."
					/>
				</div>
				<AnalyticsSidebar campaignId={id as Id<"campaigns">} />
			</div>
		);
	}

	return (
		<div className="flex w-full h-full">
			<div className="flex overflow-hidden flex-col flex-1 px-6 pt-6">
				<AnalyticsControlBar campaignId={id as Id<"campaigns">} />
				{renderScreen(currentScreen, id as Id<"campaigns">)}
			</div>
			<AnalyticsSidebar campaignId={id as Id<"campaigns">} />
		</div>
	);
};
