"use client";

import { WorldMapChart } from "@/components/analytics/charts/world-map-chart";
import { KPICardsContainer } from "@/components/analytics/containers/kpi-cards-container";
import { AnalyticsControlBar } from "@/components/analytics/controls/analytics-control-bar";
import { useCampaignAnalytics } from "@/hooks/state/use-campaign-analytics";
import type { Id } from "@firebuzz/convex";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { toast } from "@firebuzz/ui/lib/utils";
import { AudienceActiveDaysChart } from "./charts/audience-active-days-chart";
import { AudienceCitiesChart } from "./charts/audience-cities-chart";
import { AudienceContinentsChart } from "./charts/audience-continents-chart";
import { AudienceDevicesChart } from "./charts/audience-devices-chart";
import { AudienceHourlyActivityChart } from "./charts/audience-hourly-activity-chart";
import { AudienceLanguagesChart } from "./charts/audience-languages-chart";
import { AudienceOperatingSystemsChart } from "./charts/audience-operating-systems-chart";
import { AudienceTimezonesChart } from "./charts/audience-timezones-chart";
import { AudienceVisitorTrendsChart } from "./charts/audience-visitor-trends-chart";

interface CampaignAnalyticsAudienceProps {
  campaignId: Id<"campaigns">;
}

export const CampaignAnalyticsAudience = ({
  campaignId,
}: CampaignAnalyticsAudienceProps) => {
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
      toast.success("Audience data refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh audience data");
      console.error("Failed to revalidate audience analytics:", error);
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
              key={`audience-skeleton-${
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
            No audience data available
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Audience data will be available once your campaign is published and
            starts receiving traffic.
          </p>
        </div>
      </div>
    );
  }

  // Calculate KPI values with fallbacks across different data sources
  const getUniqueUsers = () => {
    return (
      data.audienceBreakdown?.payload.total_users ||
      data.sumPrimitives?.payload.current_users ||
      0
    );
  };

  const getTotalSessions = () => {
    return (
      data.audienceBreakdown?.payload.total_sessions ||
      data.sumPrimitives?.payload.current_all_sessions ||
      0
    );
  };

  const getNewSessions = () => {
    // Try to get from user_types in audience breakdown first
    if (data.audienceBreakdown?.payload.user_types) {
      const newUserData = data.audienceBreakdown.payload.user_types.find(
        ([type]) => String(type).toLowerCase() === "new"
      );
      if (newUserData) return Number(newUserData[1]);
    }
    // Fallback to sum primitives
    return data.sumPrimitives?.payload.current_new_sessions || 0;
  };

  const getReturningSessions = () => {
    // Try to get from user_types in audience breakdown first
    if (data.audienceBreakdown?.payload.user_types) {
      const returningUserData = data.audienceBreakdown.payload.user_types.find(
        ([type]) => String(type).toLowerCase() === "returning"
      );
      if (returningUserData) return Number(returningUserData[1]);
    }
    // Fallback to sum primitives
    return data.sumPrimitives?.payload.current_returning_sessions || 0;
  };

  // Create audience-specific KPI payload - reorder to show Users, Sessions, New Sessions, Returning Sessions
  const audienceKPIPayload = {
    current_users: getUniqueUsers(),
    current_all_sessions: getTotalSessions(),
    current_new_sessions: getNewSessions(),
    current_returning_sessions: getReturningSessions(),
    current_pageviews: 0,
    current_conversions: 0,
    current_conversion_value: 0,
    current_external_link_clicks: 0,
    current_form_submissions: 0,
    current_avg_session_duration: 0,
    current_bounced_sessions: 0,
    previous_users: 0,
    previous_all_sessions: 0,
    previous_new_sessions: 0,
    previous_returning_sessions: 0,
    previous_pageviews: 0,
    previous_conversions: 0,
    previous_conversion_value: 0,
    previous_external_link_clicks: 0,
    previous_form_submissions: 0,
    previous_avg_session_duration: 0,
    previous_bounced_sessions: 0,
    current_custom_events: [],
    previous_custom_events: [],
  };

  // Show no data state
  if (!data.audienceBreakdown && !data.sumPrimitives) {
    return (
      <div className="space-y-6">
        <AnalyticsControlBar
          period={period}
          setPeriod={setPeriod}
          isPreview={isPreview}
          setIsPreview={setIsPreview}
          onRevalidate={handleRevalidate}
          currentScreen="audience"
        />
        <div className="flex flex-col justify-center items-center py-12 space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-muted-foreground">
              No audience data found for this period
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try selecting a different time period or check back later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const source =
    data.audienceBreakdown?.source || data.sumPrimitives?.source || "firebuzz";

  return (
    <div className="flex overflow-hidden flex-col px-6 pt-6 max-h-full">
      {/* Control Bar */}
      <AnalyticsControlBar
        period={period}
        setPeriod={setPeriod}
        isPreview={isPreview}
        setIsPreview={setIsPreview}
        onRevalidate={handleRevalidate}
        isRevalidating={data.audienceBreakdown?.isRefreshing}
        currentScreen="audience"
      />

      <div className="flex overflow-hidden relative flex-col max-h-full">
        {/* Gradient background - Top */}
        <div className="absolute top-0 right-0 left-0 z-10 h-6 bg-gradient-to-b to-transparent from-background" />
        <div className="overflow-y-auto relative py-6 space-y-6 max-h-full">
          {/* KPI Cards */}
          <KPICardsContainer
            payload={audienceKPIPayload}
            source={source}
            campaignSettings={campaign?.campaignSettings}
            customKPIs={[
              {
                id: "users",
                title: "Unique Users",
                field: "current_users",
              },
              {
                id: "sessions",
                title: "Total Sessions",
                field: "current_all_sessions",
              },
              {
                id: "new_sessions",
                title: "New Sessions",
                field: "current_new_sessions",
              },
              {
                id: "returning_sessions",
                title: "Returning Sessions",
                field: "current_returning_sessions",
              },
            ]}
          />

          {/* Top Row: Countries and New vs Returning */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <WorldMapChart
              data={
                (data.audienceBreakdown?.payload.countries ||
                  data.realtimeOverview?.payload.countries ||
                  []) as string[] | [string, number][]
              }
              title="Top 30 Countries"
              description="Geographic distribution of your audience"
              source={source}
            />
            <AudienceVisitorTrendsChart
              timeseriesData={data.timeseriesPrimitives}
              isLoading={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Continents */}
            <AudienceContinentsChart
              audienceData={data.audienceBreakdown}
              realtimeData={data.realtimeOverview}
            />
            {/* Cities */}
            <AudienceCitiesChart audienceData={data.audienceBreakdown} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Active Days */}
            <AudienceActiveDaysChart
              timeseriesData={data.timeseriesPrimitives}
            />
            {/* Hourly Activity */}
            <AudienceHourlyActivityChart
              audienceData={data.audienceBreakdown}
            />
          </div>

          {/* Audience Breakdown Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Timezones */}
            <AudienceTimezonesChart
              audienceData={data.audienceBreakdown}
              timeseriesData={data.timeseriesPrimitives}
            />

            {/* Languages */}
            <AudienceLanguagesChart audienceData={data.audienceBreakdown} />

            {/* Devices */}
            <AudienceDevicesChart audienceData={data.audienceBreakdown} />

            {/* Operating Systems */}
            <AudienceOperatingSystemsChart
              audienceData={data.audienceBreakdown}
            />
          </div>
        </div>
        {/* Gradient background - Bottom */}
        <div className="absolute right-0 bottom-0 left-0 z-10 h-6 bg-gradient-to-b from-transparent to-background" />
      </div>
    </div>
  );
};
