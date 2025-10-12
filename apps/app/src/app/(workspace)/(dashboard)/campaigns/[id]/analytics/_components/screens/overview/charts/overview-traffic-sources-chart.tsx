import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";
import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";

interface OverviewTrafficSourcesChartProps {
	audienceData?: {
		payload?: {
			utm_sources?: unknown[][];
		};
		source?: Doc<"analyticsPipes">["source"];
	} | null;
}

export const OverviewTrafficSourcesChart = ({
	audienceData,
}: OverviewTrafficSourcesChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (
			!audienceData?.payload?.utm_sources ||
			!Array.isArray(audienceData.payload.utm_sources)
		) {
			return [];
		}

		// utm_sources is an array of tuples: [source_name, sessions, users, new_sessions, returning_sessions, percentage]
		return audienceData.payload.utm_sources
			.slice(0, 5) // Get top 5 sources
			.map((sourceData, index) => {
				if (!Array.isArray(sourceData) || sourceData.length < 6) {
					return {
						name: "Unknown",
						value: 0,
						percentage: 0,
						fill: `var(--chart-${(index % 5) + 1})`,
					};
				}

				const sourceName = String(sourceData[0]);
				const sessions = Number(sourceData[1]) || 0;
				const percentage = Number(sourceData[5]) || 0;

				return {
					name: sourceName,
					value: sessions,
					percentage,
					fill: `var(--chart-${(index % 5) + 1})`,
				};
			});
	}, [audienceData]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="Top 5 Traffic Sources"
			description="Sessions by traffic source"
			valueLabel="Sessions"
			source={audienceData?.source}
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};
