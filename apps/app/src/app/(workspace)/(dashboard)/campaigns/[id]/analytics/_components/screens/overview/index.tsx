"use client";

import { LandingPagesList } from "@/components/analytics/charts/landing-pages-list";
import { KPICardsContainer } from "@/components/analytics/containers/kpi-cards-container";
import { EmptyState } from "@/components/analytics/states";
import { useCampaignAnalytics } from "@/hooks/state/use-campaign-analytics";
import type { Id } from "@firebuzz/convex";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { OverviewEngagementTrendsChart } from "./charts/overview-engagement-trends-chart";
import { OverviewSessionConversionTrendsChart } from "./charts/overview-session-conversion-trends-chart";
import { OverviewTrafficSourcesChart } from "./charts/overview-traffic-sources-chart";

interface CampaignAnalyticsOverviewProps {
	campaignId: Id<"campaigns">;
}

export const CampaignAnalyticsOverview = ({
	campaignId,
}: CampaignAnalyticsOverviewProps) => {
	const {
		campaign,

		data,
		isLoading,
	} = useCampaignAnalytics({ campaignId });

	// Show loading state
	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<Skeleton className="h-10 w-[180px]" />
					<div className="flex gap-4 items-center">
						<Skeleton className="w-20 h-6" />
						<Skeleton className="w-20 h-9" />
					</div>
				</div>
				<div className="grid grid-cols-1 gap-4 p-4 rounded-xl border sm:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`skeleton-${
								// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
								i
							}`}
							className="p-4 space-y-3 rounded-lg border"
						>
							<div className="flex justify-between items-center">
								<div className="flex gap-2 items-center">
									<Skeleton className="w-4 h-4 rounded" />
									<Skeleton className="w-20 h-4" />
								</div>
								<Skeleton className="w-4 h-4 rounded" />
							</div>
							<Skeleton className="w-16 h-8" />
							<div className="flex justify-between items-center">
								<Skeleton className="w-12 h-4" />
								<Skeleton className="w-16 h-3" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	// Show no data state
	if (!data.sumPrimitives) {
		return <EmptyState />;
	}

	return (
		<div className="flex overflow-hidden relative flex-col max-h-full">
			{/* Gradient background - Top */}
			<div className="absolute top-0 right-0 left-0 z-10 h-5 bg-gradient-to-b to-transparent from-background" />
			<div className="overflow-y-auto relative pt-5 pb-6 space-y-6 max-h-full">
				{/* KPI Cards */}
				<KPICardsContainer
					payload={data.sumPrimitives.payload}
					source={data.sumPrimitives.source}
					campaignSettings={campaign?.campaignSettings}
				/>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{/* Sessions & Conversions Chart */}
					<OverviewSessionConversionTrendsChart
						timeseriesData={data.timeseriesPrimitives}
						isLoading={isLoading}
					/>
					{/* Session Quality Trend - Full Width */}
					<OverviewEngagementTrendsChart
						timeseriesData={data.timeseriesPrimitives}
						isLoading={isLoading}
					/>
				</div>

				{/* Additional Analytics Charts */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{/* Top 5 Traffic Sources */}
					<OverviewTrafficSourcesChart audienceData={data.audienceBreakdown} />

					{/* Top Converting Landing Pages */}
					<LandingPagesList
						conversionsData={data.conversionsBreakdown}
						landingPagesData={data.landingPages}
						isLoading={isLoading}
					/>
				</div>
			</div>
			{/* Gradient background - Bottom */}
			<div className="absolute right-0 bottom-0 left-0 z-10 h-6 bg-gradient-to-b from-transparent to-background" />
		</div>
	);
};
