"use client";

import type { Id } from "@firebuzz/convex";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { LandingPagesList } from "@/components/analytics/charts/landing-pages-list";
import { KPICardsContainer } from "@/components/analytics/containers/kpi-cards-container";
import { EmptyState } from "@/components/analytics/states";
import { useCampaignAnalytics } from "@/hooks/state/use-campaign-analytics";
import { ConversionsCumulativeValueChart } from "./charts/conversions-cumulative-value-chart";
import { ConversionsDailyPatternsChart } from "./charts/conversions-daily-patterns-chart";
import { ConversionsDeviceChart } from "./charts/conversions-device-chart";
import { ConversionsGeographicChart } from "./charts/conversions-geographic-chart";
import { ConversionsHourlyPatternsChart } from "./charts/conversions-hourly-patterns-chart";
import { ConversionsSourceChart } from "./charts/conversions-source-chart";
import { ConversionsUserTypeChart } from "./charts/conversions-user-type-chart";
import { ConversionsUtmChart } from "./charts/conversions-utm-chart";
import { ConversionsValueDistributionChart } from "./charts/conversions-value-distribution-chart";

interface CampaignAnalyticsConversionsProps {
	campaignId: Id<"campaigns">;
}

export const CampaignAnalyticsConversions = ({
	campaignId,
}: CampaignAnalyticsConversionsProps) => {
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
							key={`conversions-skeleton-${
								// biome-ignore lint/suspicious/noArrayIndexKey: skeleton items don't have stable IDs
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

	// Calculate KPI values from conversions breakdown data
	const getTotalConversions = () => {
		return data.conversionsBreakdown?.payload.total_conversions || 0;
	};

	const getTotalConversionValue = () => {
		return data.conversionsBreakdown?.payload.total_conversion_value || 0;
	};

	const getOverallConversionRate = () => {
		return data.conversionsBreakdown?.payload.overall_conversion_rate || 0;
	};

	const getAverageConversionValue = () => {
		const total = getTotalConversions();
		const value = getTotalConversionValue();
		return total > 0 ? value / total : 0;
	};

	// Use sumPrimitives data if available, otherwise create conversion-focused payload
	const totalConversions = getTotalConversions();
	const totalConversionValue = getTotalConversionValue();
	const overallConversionRate = getOverallConversionRate();
	const avgConversionValue = getAverageConversionValue();

	// Always use our calculated conversion values for accuracy
	const kpiPayload = {
		current_conversions: totalConversions,
		current_conversion_value: totalConversionValue,
		current_all_sessions: overallConversionRate, // Store conversion rate here
		current_users: avgConversionValue, // Store avg conversion value here
		current_pageviews: 0,
		current_new_sessions: 0,
		current_returning_sessions: 0,
		current_external_link_clicks: 0,
		current_form_submissions: 0,
		current_avg_session_duration: 0,
		current_bounced_sessions: 0,
		previous_conversions: 0,
		previous_conversion_value: 0,
		previous_all_sessions: 0, // Previous conversion rate would be 0 without period comparison
		previous_users: 0, // Previous avg conversion value would be 0 without period comparison
		previous_pageviews: 0,
		previous_new_sessions: 0,
		previous_returning_sessions: 0,
		previous_external_link_clicks: 0,
		previous_form_submissions: 0,
		previous_avg_session_duration: 0,
		previous_bounced_sessions: 0,
		current_custom_events: [],
		previous_custom_events: [],
	};

	// Show no data state
	if (!data.conversionsBreakdown) {
		return <EmptyState />;
	}

	const source = data.conversionsBreakdown?.source || "firebuzz";

	return (
		<div className="flex overflow-hidden relative flex-col max-h-full">
			{/* Gradient background - Top */}
			<div className="absolute top-0 right-0 left-0 z-10 h-5 bg-gradient-to-b to-transparent from-background" />
			<div className="overflow-y-auto relative pt-5 pb-6 space-y-6 max-h-full">
				{/* KPI Cards */}
				<KPICardsContainer
					payload={kpiPayload}
					source={source}
					campaignSettings={campaign?.campaignSettings}
					customKPIs={[
						{
							id: "conversions",
							title: "Total Conversions",
							field: "current_conversions",
						},
						{
							id: "conversion_value",
							title: "Total Conversion Value",
							field: "current_conversion_value",
							// Currency prefix and compact formatting will be applied automatically
						},
						{
							id: "conversion_rate",
							title: "Conversion Rate",
							field: "current_all_sessions", // We'll store the conversion rate here
							suffix: "%",
							isPercentage: true,
							formatOptions: {
								maximumFractionDigits: 1,
							},
						},
						{
							id: "avg_conversion_value",
							title: "Avg. Conversion Value",
							field: "current_users", // We'll store the avg conversion value here
							// Currency prefix and compact formatting will be applied automatically
						},
					]}
				/>

				{/* Row 1: Time Series & Geographic */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ConversionsCumulativeValueChart
						timeseriesData={data.timeseriesPrimitives}
						isLoading={isLoading}
					/>
					<ConversionsGeographicChart
						conversionsData={data.conversionsBreakdown}
					/>
				</div>

				{/* Row 2: Device & User Type */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ConversionsDeviceChart conversionsData={data.conversionsBreakdown} />
					<ConversionsUserTypeChart
						conversionsData={data.conversionsBreakdown}
					/>
				</div>

				{/* Row 3: UTM Analysis & Traffic Sources */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ConversionsUtmChart conversionsData={data.conversionsBreakdown} />
					<ConversionsSourceChart conversionsData={data.conversionsBreakdown} />
				</div>

				{/* Row 4: Temporal Patterns */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ConversionsHourlyPatternsChart
						conversionsData={data.conversionsBreakdown}
					/>
					<ConversionsDailyPatternsChart
						conversionsData={data.conversionsBreakdown}
					/>
				</div>

				{/* Row 5: Advanced Analysis */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<LandingPagesList
						conversionsData={data.conversionsBreakdown}
						landingPagesData={data.landingPages}
						isLoading={isLoading}
					/>
					<ConversionsValueDistributionChart
						conversionsData={data.conversionsBreakdown}
					/>
				</div>
			</div>
			{/* Gradient background - Bottom */}
			<div className="absolute right-0 bottom-0 left-0 z-10 h-6 bg-gradient-to-b from-transparent to-background" />
		</div>
	);
};
