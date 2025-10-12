import type { Doc } from "@firebuzz/convex";
import { TimeSeriesChartWrapper } from "@/components/analytics/charts/time-series-chart";

interface OverviewSessionConversionTrendsChartProps {
	timeseriesData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "timeseries-primitives" }
	> | null;
	isLoading?: boolean;
}

export const OverviewSessionConversionTrendsChart = ({
	timeseriesData,
	isLoading,
}: OverviewSessionConversionTrendsChartProps) => {
	return (
		<TimeSeriesChartWrapper
			timeseriesData={timeseriesData}
			isLoading={isLoading}
			isCumulative
			title="Sessions & Conversions Trend"
			description="Total sessions and conversions over time"
			dataKeys={["all_sessions", "bounced_sessions"]}
			datasets={[
				{
					key: "all_sessions",
					label: "Total",
					color: "var(--chart-1)",
					strokeWidth: 2,
					fillOpacity: 0.3,
				},
				{
					key: "bounced_sessions",
					label: "Bounced",
					color: "var(--chart-fuchsia)", // red-500 for bounced sessions
					strokeWidth: 2,
					fillOpacity: 0.3,
				},
			]}
			granularity="day"
			showTrend={true}
			source={timeseriesData?.source}
		/>
	);
};
