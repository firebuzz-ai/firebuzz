import { TimeSeriesChartWrapper } from "@/components/analytics/charts/time-series-chart";
import type { Doc } from "@firebuzz/convex";

interface AudienceVisitorTrendsChartProps {
	timeseriesData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "timeseries-primitives" }
	> | null;
	isLoading?: boolean;
}

export const AudienceVisitorTrendsChart = ({
	timeseriesData,
	isLoading,
}: AudienceVisitorTrendsChartProps) => {
	return (
		<TimeSeriesChartWrapper
			timeseriesData={timeseriesData}
			isLoading={isLoading}
			title="New vs Returning Visitors"
			description="New and returning sessions over time"
			dataKeys={["new_sessions", "returning_sessions"]}
			datasets={[
				{
					key: "new_sessions",
					label: "New",
					color: "#10b981", // emerald-500
					strokeWidth: 2,
					fillOpacity: 0.3,
				},
				{
					key: "returning_sessions",
					label: "Returning",
					color: "hsl(var(--brand))",
					strokeWidth: 2,
					fillOpacity: 0.3,
				},
			]}
			granularity="day"
			isCumulative={true} // Use cumulative like other charts
			showTrend={true}
			isRealtime={false}
			source={timeseriesData?.source}
		/>
	);
};
