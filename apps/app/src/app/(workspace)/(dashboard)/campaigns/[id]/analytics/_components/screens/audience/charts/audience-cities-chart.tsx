import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";
import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";

interface AudienceCitiesChartProps {
	audienceData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "audience-breakdown" }
	> | null;
}

export const AudienceCitiesChart = ({
	audienceData,
}: AudienceCitiesChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (
			!audienceData?.payload.cities ||
			audienceData.payload.cities.length === 0
		) {
			return [];
		}

		return audienceData.payload.cities
			.map((cityData, index) => {
				// Format: [city, country, sessions, users, new_sessions, returning_sessions, percentage]
				const [city, _country, sessions] = cityData;
				return {
					name: String(city).charAt(0).toUpperCase() + String(city).slice(1),
					value: Number(sessions) || 0,
					fill: `var(--chart-${(index % 5) + 1})`,
				};
			})
			.filter((item) => !Number.isNaN(item.value) && item.value > 0);
	}, [audienceData]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="Top 5 Cities"
			description="Cities with the most audience activity"
			valueLabel="Sessions"
			source={audienceData?.source}
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};
