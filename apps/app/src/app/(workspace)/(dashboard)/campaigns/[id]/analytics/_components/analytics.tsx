"use client";

import { type Id, api, useCachedRichQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { notFound } from "next/navigation";
import { useCampaignAnalytics } from "@/hooks/state/use-campaign-analytics";
import { AnalyticsSidebar } from "./analytics-sidebar";
import { CampaignAnalyticsOverview } from "./screens/overview";
import { CampaignAnalyticsRealtime } from "./screens/realtime";
import { CampaignAnalyticsAudience } from "./screens/audience";

interface AnalyticsProps {
	id: string;
}

export const Analytics = ({ id }: AnalyticsProps) => {
	const { screen: currentScreen } = useCampaignAnalytics({
		campaignId: id as Id<"campaigns">,
	});

	const {
		data: campaign,
		isPending: isLoading,
		isError,
	} = useCachedRichQuery(
		api.collections.campaigns.queries.getById,
		id
			? {
					id: id as Id<"campaigns">,
				}
			: "skip",
	);

	if (isLoading) {
		return (
			<div className="flex justify-center items-center w-full h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	if (isError) {
		return <div>Error</div>;
	}

	if (!campaign) {
		return notFound();
	}

	const renderScreen = () => {
		switch (currentScreen) {
			case "overview":
				return <CampaignAnalyticsOverview campaignId={id as Id<"campaigns">} />;
			case "realtime":
				return <CampaignAnalyticsRealtime campaignId={id as Id<"campaigns">} />;
			case "audience":
				return <CampaignAnalyticsAudience campaignId={id as Id<"campaigns">} />;
			case "ab-tests":
				return <div className="p-6">A/B Tests Screen (Coming Soon)</div>;
			default:
				return <CampaignAnalyticsOverview campaignId={id as Id<"campaigns">} />;
		}
	};

	return (
		<div className="flex h-full w-full">
			<div className="flex-1 overflow-hidden">
				{renderScreen()}
			</div>
			<AnalyticsSidebar campaignId={id as Id<"campaigns">} />
		</div>
	);
};
