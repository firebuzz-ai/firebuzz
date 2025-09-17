import { TimeSeriesChartWrapper } from "@/components/analytics/charts/time-series-chart";
import type { Doc } from "@firebuzz/convex";

interface OverviewEngagementTrendsChartProps {
	timeseriesData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "timeseries-primitives" }
	> | null;
	isLoading?: boolean;
}

export const OverviewEngagementTrendsChart = ({
	timeseriesData,
	isLoading,
}: OverviewEngagementTrendsChartProps) => {
	return (
		<TimeSeriesChartWrapper
			timeseriesData={timeseriesData}
			isLoading={isLoading}
			title="Session Quality Trends"
			description="Total and bounced sessions over time"
			dataKeys={["all_sessions", "conversions"]}
			datasets={[
				{
					key: "all_sessions",
					label: "Total",
					color: "var(--chart-1)",
					strokeWidth: 2,
					fillOpacity: 0.3,
				},
				{
					key: "conversions",
					label: "Conversions",
					color: "var(--chart-emerald)", // emerald-500 for conversions
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
