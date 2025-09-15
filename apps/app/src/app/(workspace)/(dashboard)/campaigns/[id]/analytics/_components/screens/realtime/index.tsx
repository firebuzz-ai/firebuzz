"use client";

import { AnalyticsControlBar } from "@/components/analytics/analytics-control-bar";
import { HorizontalBarChart, type HorizontalBarChartData } from "@/components/analytics/horizontal-bar-chart";
import { KPICardsContainer } from "@/components/analytics/kpi-cards-container";
import { useCampaignAnalytics } from "@/hooks/state/use-campaign-analytics";
import type { Doc, Id } from "@firebuzz/convex";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { toast } from "@firebuzz/ui/lib/utils";
import { useMemo } from "react";

interface CampaignAnalyticsRealtimeProps {
	campaignId: Id<"campaigns">;
}

export const CampaignAnalyticsRealtime = ({
	campaignId,
}: CampaignAnalyticsRealtimeProps) => {
	const {
		campaign,
		period,
		setPeriod,
		isPreview,
		setIsPreview,
		data,
		isLoading,
		canShowAnalytics,
		revalidate,
	} = useCampaignAnalytics({ campaignId });

	const handleRevalidate = async () => {
		try {
			await revalidate();
			toast.success("Realtime data refreshed successfully");
		} catch (error) {
			toast.error("Failed to refresh realtime data");
			console.error("Failed to revalidate realtime analytics:", error);
		}
	};

	// Show loading state
	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<Skeleton className="h-8 w-[180px]" />
					<div className="flex gap-4 items-center">
						<Skeleton className="w-20 h-8" />
						<Skeleton className="w-20 h-8" />
					</div>
				</div>
				<div className="grid grid-cols-1 gap-4 p-4 rounded-xl border sm:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`realtime-skeleton-${i}`}
							className="p-4 space-y-3 rounded-lg border"
						>
							<div className="flex justify-between items-center">
								<div className="flex gap-2 items-center">
									<Skeleton className="w-4 h-4 rounded" />
									<Skeleton className="w-20 h-4" />
								</div>
								<Skeleton className="w-4 h-4 rounded animate-pulse" />
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

	// Show unpublished state
	if (!canShowAnalytics) {
		return (
			<div className="flex flex-col justify-center items-center py-12 space-y-4">
				<div className="text-center">
					<h3 className="text-lg font-semibold text-muted-foreground">
						No realtime data available
					</h3>
					<p className="mt-2 text-sm text-muted-foreground">
						Realtime data will be available once your campaign is published and
						starts receiving traffic.
					</p>
				</div>
			</div>
		);
	}

	// Show no data state
	if (!data.realtimeOverview) {
		return (
			<div className="space-y-6">
				<AnalyticsControlBar
					period={period}
					setPeriod={setPeriod}
					isPreview={isPreview}
					setIsPreview={setIsPreview}
					onRevalidate={handleRevalidate}
					currentScreen="realtime"
				/>
				<div className="flex flex-col justify-center items-center py-12 space-y-4">
					<div className="text-center">
						<h3 className="text-lg font-semibold text-muted-foreground">
							No realtime activity found
						</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							Waiting for live activity on your campaign. Check back in a few
							moments.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex overflow-hidden flex-col px-6 pt-6 max-h-full">
			{/* Control Bar */}
			<AnalyticsControlBar
				period={period}
				setPeriod={setPeriod}
				isPreview={isPreview}
				setIsPreview={setIsPreview}
				onRevalidate={handleRevalidate}
				isRevalidating={data.realtimeOverview?.isRefreshing}
				currentScreen="realtime"
			/>

			<div className="overflow-y-auto pt-3 pb-6 mt-3 space-y-6 max-h-full">
				{/* KPI Cards */}
				<KPICardsContainer
					payload={{
						// Primary metrics for realtime
						current_all_sessions: data.realtimeOverview.payload.active_sessions,
						current_pageviews: data.realtimeOverview.payload.events,
						current_conversions: data.realtimeOverview.payload.conversions,
						current_conversion_value: data.realtimeOverview.payload.conversion_value,
						// Set previous values to 0 since realtime doesn't have comparison
						previous_all_sessions: 0,
						previous_pageviews: 0,
						previous_conversions: 0,
						previous_conversion_value: 0,
						// Additional required fields (set to 0 for realtime)
						current_new_sessions: 0,
						current_returning_sessions: 0,
						current_users: 0,
						current_external_link_clicks: 0,
						current_form_submissions: 0,
						current_avg_session_duration: 0,
						current_bounced_sessions: 0,
						previous_new_sessions: 0,
						previous_returning_sessions: 0,
						previous_users: 0,
						previous_external_link_clicks: 0,
						previous_form_submissions: 0,
						previous_avg_session_duration: 0,
						previous_bounced_sessions: 0,
						current_custom_events: [],
						previous_custom_events: [],
					}}
					source={data.realtimeOverview.source}
					campaignSettings={campaign?.campaignSettings}
					isRealtime={true}
				/>

				{/* Realtime Breakdowns */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{/* Active Countries */}
					<RealtimeCountriesChart data={data.realtimeOverview} />

					{/* Active Devices */}
					<RealtimeDevicesChart data={data.realtimeOverview} />

					{/* Traffic Sources */}
					<RealtimeTrafficSourcesChart data={data.realtimeOverview} />

					{/* Recent Events */}
					<RealtimeEventsChart data={data.realtimeOverview} />
				</div>

				{/* Top Landing Pages */}
				<RealtimeLandingPagesChart data={data.realtimeOverview} />
			</div>
		</div>
	);
};

// Helper components for different realtime chart types
interface RealtimeChartProps {
	data: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "realtime-overview" }
	>;
}

const RealtimeCountriesChart = ({ data }: RealtimeChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (!data.payload.countries || data.payload.countries.length === 0) {
			return [];
		}

		return data.payload.countries.map((country, index) => ({
			name: country,
			value: 1, // Realtime data doesn't provide counts, so we show 1 for active
			fill: `var(--chart-${(index % 5) + 1})`,
		}));
	}, [data]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="Active Countries"
			description="Countries with current activity"
			valueLabel="Active"
			source={data.source}
			isRealtime
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};

const RealtimeDevicesChart = ({ data }: RealtimeChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (!data.payload.devices || data.payload.devices.length === 0) {
			return [];
		}

		return data.payload.devices.map((device, index) => ({
			name: device.charAt(0).toUpperCase() + device.slice(1),
			value: 1, // Realtime data doesn't provide counts
			fill: `var(--chart-${(index % 5) + 1})`,
		}));
	}, [data]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="Active Devices"
			description="Device types with current activity"
			valueLabel="Active"
			source={data.source}
			isRealtime
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};

const RealtimeTrafficSourcesChart = ({ data }: RealtimeChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (!data.payload.traffic_sources || data.payload.traffic_sources.length === 0) {
			return [];
		}

		return data.payload.traffic_sources.map((source, index) => ({
			name: source.charAt(0).toUpperCase() + source.slice(1),
			value: 1, // Realtime data doesn't provide counts
			fill: `var(--chart-${(index % 5) + 1})`,
		}));
	}, [data]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="Traffic Sources"
			description="Sources with current activity"
			valueLabel="Active"
			source={data.source}
			isRealtime
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};

const RealtimeEventsChart = ({ data }: RealtimeChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (!data.payload.top_events || data.payload.top_events.length === 0) {
			return [];
		}

		return data.payload.top_events.map((event, index) => ({
			name: event,
			value: 1, // Realtime data doesn't provide counts
			fill: `var(--chart-${(index % 5) + 1})`,
		}));
	}, [data]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="Recent Events"
			description="Latest events from your campaign"
			valueLabel="Event"
			source={data.source}
			isRealtime
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};

const RealtimeLandingPagesChart = ({ data }: RealtimeChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (!data.payload.top_landing_pages || data.payload.top_landing_pages.length === 0) {
			return [];
		}

		return data.payload.top_landing_pages.map((page, index) => {
			// Show only the last part of the path for better readability
			const parts = page.split('/');
			const pageName = parts[parts.length - 1] || page;

			return {
				name: pageName,
				value: 1, // Realtime data doesn't provide counts
				fill: `var(--chart-${(index % 5) + 1})`,
			};
		});
	}, [data]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="Top Landing Pages"
			description="Pages with current visitor activity"
			valueLabel="Active"
			source={data.source}
			isRealtime
			showTrend={chartData.length > 0}
			maxItems={5}
			className="lg:col-span-2"
		/>
	);
};
