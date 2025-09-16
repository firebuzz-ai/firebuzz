import { TimeSeriesChartWrapper } from "@/components/analytics/charts/time-series-chart";
import type { Doc } from "@firebuzz/convex";

interface AudienceEngagementTrendsChartProps {
  timeseriesData?: Extract<
    Doc<"analyticsPipes">,
    { queryId: "timeseries-primitives" }
  > | null;
  isLoading?: boolean;
}

export const AudienceEngagementTrendsChart = ({
  timeseriesData,
  isLoading,
}: AudienceEngagementTrendsChartProps) => {
  return (
    <TimeSeriesChartWrapper
      timeseriesData={timeseriesData}
      isLoading={isLoading}
      title="Session Quality Trends"
      description="Total and bounced sessions over time"
      dataKeys={["all_sessions", "bounced_sessions"]}
      datasets={[
        {
          key: "all_sessions",
          label: "Total",
          color: "hsl(var(--brand))",
          strokeWidth: 2,
          fillOpacity: 0.3,
        },
        {
          key: "bounced_sessions",
          label: "Bounced",
          color: "#ef4444", // red-500 for bounced sessions
          strokeWidth: 2,
          fillOpacity: 0.3,
        },
      ]}
      granularity="day"
      isCumulative={true} // Use cumulative like in overview
      showTrend={true}
      isRealtime={false}
      source={timeseriesData?.source}
    />
  );
};