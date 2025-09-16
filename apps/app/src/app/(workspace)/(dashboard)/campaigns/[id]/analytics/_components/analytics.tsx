"use client";

import { FlowLayout } from "@/components/layouts/two-panels/panels/campaign/flow";
import { PanelLayout } from "@/components/layouts/two-panels/panels/campaign/panel";
import { TwoPanelsProvider } from "@/components/layouts/two-panels/provider";
import { type Id, api, useCachedRichQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { notFound, useSearchParams } from "next/navigation";
import { Panel } from "./panel";
import { CampaignAnalyticsOverview } from "./screens/overview";
import { CampaignAnalyticsRealtime } from "./screens/realtime";
import { CampaignAnalyticsAudience } from "./screens/audience";

interface AnalyticsProps {
	id: string;
	rightPanelSize: number;
}

export const Analytics = ({ id, rightPanelSize }: AnalyticsProps) => {
	const searchParams = useSearchParams();
	const currentScreen = searchParams.get("screen") || "overview";

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
			case "abtests":
				return <div className="p-6">A/B Tests Screen (Coming Soon)</div>;
			default:
				return <CampaignAnalyticsOverview campaignId={id as Id<"campaigns">} />;
		}
	};

	return (
		<>
			<TwoPanelsProvider
				rightPanelSizeFromCookie={rightPanelSize}
				id="campaign-analytics"
				isRightPanelClosable={true}
			>
				<FlowLayout>{renderScreen()}</FlowLayout>
				<PanelLayout>
					<Panel />
				</PanelLayout>
			</TwoPanelsProvider>
		</>
	);
};
