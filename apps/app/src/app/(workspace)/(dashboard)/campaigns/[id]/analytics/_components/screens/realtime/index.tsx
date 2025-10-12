"use client";

import type { Id } from "@firebuzz/convex";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { KPICardsContainer } from "@/components/analytics/containers/kpi-cards-container";
import { EmptyState } from "@/components/analytics/states";
import { useCampaignAnalytics } from "@/hooks/state/use-campaign-analytics";
import { RealtimeDevicesChart } from "./charts/realtime-devices-chart";
import { RealtimeEventsChart } from "./charts/realtime-events-chart";
import { RealtimeLandingPagesChart } from "./charts/realtime-landing-pages-chart";
import { RealtimeTrafficSourcesChart } from "./charts/realtime-traffic-sources-chart";
import { RealtimeWorldMapChart } from "./charts/realtime-world-map-chart";

interface CampaignAnalyticsRealtimeProps {
	campaignId: Id<"campaigns">;
}

export const CampaignAnalyticsRealtime = ({
	campaignId,
}: CampaignAnalyticsRealtimeProps) => {
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
					<Skeleton className="h-8 w-[180px]" />
					<div className="flex gap-4 items-center">
						<Skeleton className="w-20 h-8" />
						<Skeleton className="w-20 h-8" />
					</div>
				</div>
				<div className="grid grid-cols-1 gap-4 p-4 rounded-xl border sm:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`realtime-skeleton-${
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

	// Show no data state
	if (!data.realtimeOverview) {
		return <EmptyState />;
	}

	return (
		<div className="flex overflow-hidden relative flex-col max-h-full">
			{/* Gradient background - Top */}
			<div className="absolute top-0 right-0 left-0 z-10 h-5 bg-gradient-to-b to-transparent from-background" />
			<div className="overflow-y-auto relative pt-5 pb-6 space-y-6 max-h-full">
				{/* KPI Cards */}
				<KPICardsContainer
					payload={{
						// Primary metrics for realtime
						current_all_sessions: data.realtimeOverview.payload.active_sessions,
						current_pageviews: data.realtimeOverview.payload.events,
						current_conversions: data.realtimeOverview.payload.conversions,
						current_conversion_value:
							data.realtimeOverview.payload.conversion_value,
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

				{/* World Map - Full Width */}
				<RealtimeWorldMapChart data={data.realtimeOverview} />

				{/* Realtime Breakdowns */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{/* Active Devices */}
					<RealtimeDevicesChart data={data.realtimeOverview} />

					{/* Traffic Sources */}
					<RealtimeTrafficSourcesChart data={data.realtimeOverview} />

					{/* Recent Events */}
					<RealtimeEventsChart
						data={data.realtimeOverview}
						campaign={campaign}
					/>

					{/* Top Landing Pages */}
					<RealtimeLandingPagesChart
						data={data.realtimeOverview}
						landingPagesData={data.landingPages}
					/>
				</div>
			</div>
			{/* Gradient background - Bottom */}
			<div className="absolute right-0 bottom-0 left-0 z-10 h-6 bg-gradient-to-b from-transparent to-background" />
		</div>
	);
};
