import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";
import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";

interface RealtimeTrafficSourcesChartProps {
	data: Extract<Doc<"analyticsPipes">, { queryId: "realtime-overview" }>;
}

export const RealtimeTrafficSourcesChart = ({
	data,
}: RealtimeTrafficSourcesChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (
			!data.payload.traffic_sources ||
			data.payload.traffic_sources.length === 0
		) {
			return [];
		}

		return data.payload.traffic_sources.map(([source, count], index) => ({
			name: String(source).charAt(0).toUpperCase() + String(source).slice(1),
			value: Number(count), // Now we have actual session counts
			fill: `var(--chart-${(index % 5) + 1})`,
		}));
	}, [data]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="Traffic Sources"
			description="Sources with current activity"
			valueLabel="Sessions"
			source={data.source}
			isRealtime
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};
