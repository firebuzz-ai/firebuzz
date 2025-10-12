import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";
import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";

interface AudienceOperatingSystemsChartProps {
	audienceData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "audience-breakdown" }
	> | null;
}

export const AudienceOperatingSystemsChart = ({
	audienceData,
}: AudienceOperatingSystemsChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (
			!audienceData?.payload.operating_systems ||
			audienceData.payload.operating_systems.length === 0
		) {
			return [];
		}

		return audienceData.payload.operating_systems
			.map(([os, count], index) => ({
				name: String(os).charAt(0).toUpperCase() + String(os).slice(1),
				value: Number(count) || 0,
				fill: `var(--chart-${(index % 5) + 1})`,
			}))
			.filter((item) => !Number.isNaN(item.value) && item.value > 0);
	}, [audienceData]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="Top 5 Operating Systems"
			description="Operating systems used by your audience"
			valueLabel="Sessions"
			source={audienceData?.source}
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};
