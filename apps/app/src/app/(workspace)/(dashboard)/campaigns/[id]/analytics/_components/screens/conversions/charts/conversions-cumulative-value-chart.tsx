import { TimeSeriesChartWrapper } from "@/components/analytics/charts/time-series-chart";
import type { Doc } from "@firebuzz/convex";

interface ConversionsCumulativeValueChartProps {
  timeseriesData?: Extract<
    Doc<"analyticsPipes">,
    { queryId: "timeseries-primitives" }
  > | null;
  isLoading?: boolean;
}

export const ConversionsCumulativeValueChart = ({
  timeseriesData,
  isLoading,
}: ConversionsCumulativeValueChartProps) => {
  return (
    <TimeSeriesChartWrapper
      timeseriesData={timeseriesData}
      isLoading={isLoading}
      title="Cumulative Conversion Value"
      description="Total conversion value accumulated over time"
      dataKeys={["conversion_value_usd"]}
      datasets={[
        {
          key: "conversion_value_usd",
          label: "Conversion Value",
          color: "hsl(var(--brand))", // amber-500 for money/value
          strokeWidth: 3,
          fillOpacity: 0.2,
        },
      ]}
      granularity="day"
      isCumulative={true}
      showTrend={true}
      isRealtime={false}
      source={timeseriesData?.source}
    />
  );
};
