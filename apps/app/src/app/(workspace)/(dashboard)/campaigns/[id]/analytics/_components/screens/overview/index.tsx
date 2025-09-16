"use client";

import { LandingPagesList } from "@/components/analytics/charts/landing-pages-list";
import { TimeSeriesChartWrapper } from "@/components/analytics/charts/time-series-chart";
import { KPICardsContainer } from "@/components/analytics/containers/kpi-cards-container";
import { AnalyticsControlBar } from "@/components/analytics/controls/analytics-control-bar";
import { useCampaignAnalytics } from "@/hooks/state/use-campaign-analytics";
import type { Id } from "@firebuzz/convex";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { toast } from "@firebuzz/ui/lib/utils";
import { OverviewTrafficSourcesChart } from "./charts/overview-traffic-sources-chart";

interface CampaignAnalyticsOverviewProps {
  campaignId: Id<"campaigns">;
}

export const CampaignAnalyticsOverview = ({
  campaignId,
}: CampaignAnalyticsOverviewProps) => {
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
      toast.success("Analytics data refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh analytics data");
      console.error("Failed to revalidate analytics:", error);
    }
  };

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

  // Show unpublished state
  if (!canShowAnalytics) {
    return (
      <div className="flex flex-col justify-center items-center py-12 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-muted-foreground">
            No analytics data available
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Analytics data will be available once your campaign is published and
            starts receiving traffic.
          </p>
        </div>
      </div>
    );
  }

  // Show no data state
  if (!data.sumPrimitives) {
    return (
      <div className="space-y-6">
        <AnalyticsControlBar
          period={period}
          setPeriod={setPeriod}
          isPreview={isPreview}
          setIsPreview={setIsPreview}
          onRevalidate={handleRevalidate}
          currentScreen="overview"
        />
        <div className="flex flex-col justify-center items-center py-12 space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-muted-foreground">
              No data found for this period
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try selecting a different time period or check back later.
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
        isRevalidating={data.sumPrimitives?.isRefreshing}
        currentScreen="overview"
      />

      <div className="overflow-y-auto pt-3 pb-6 mt-3 space-y-6 max-h-full">
        {/* KPI Cards */}
        <KPICardsContainer
          payload={data.sumPrimitives.payload}
          source={data.sumPrimitives.source}
          campaignSettings={campaign?.campaignSettings}
        />

        {/* Sessions & Conversions Chart */}
        <TimeSeriesChartWrapper
          timeseriesData={data.timeseriesPrimitives}
          isLoading={isLoading}
          granularity="day"
          isCumulative
          title="Sessions & Conversions Trend"
          description="Total sessions and conversions over time"
        />

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
    </div>
  );
};
