"use client";

import { KPICardsContainer } from "@/components/analytics/containers/kpi-cards-container";
import { AnalyticsControlBar } from "@/components/analytics/controls/analytics-control-bar";
import { useCampaignAnalytics } from "@/hooks/state/use-campaign-analytics";
import type { Id } from "@firebuzz/convex";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { toast } from "@firebuzz/ui/lib/utils";
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
              key={`realtime-skeleton-${
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
    </div>
  );
};
