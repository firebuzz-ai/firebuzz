import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";
import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";

interface AudienceDevicesChartProps {
	audienceData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "audience-breakdown" }
	> | null;
}

export const AudienceDevicesChart = ({
	audienceData,
}: AudienceDevicesChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (
			!audienceData?.payload.device_types ||
			audienceData.payload.device_types.length === 0
		) {
			return [];
		}

		return audienceData.payload.device_types
			.map(([device, count], index) => ({
				name: String(device).charAt(0).toUpperCase() + String(device).slice(1),
				value: Number(count) || 0,
				fill: `var(--chart-${(index % 5) + 1})`,
			}))
			.filter((item) => !Number.isNaN(item.value) && item.value > 0);
	}, [audienceData]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="Top 5 Device Types"
			description="Devices used by your audience"
			valueLabel="Sessions"
			source={audienceData?.source}
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};
