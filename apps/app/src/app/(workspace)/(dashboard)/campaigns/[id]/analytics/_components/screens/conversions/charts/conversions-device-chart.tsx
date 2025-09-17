import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";
import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";

interface ConversionsDeviceChartProps {
	conversionsData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "conversions-breakdown" }
	> | null;
}

export const ConversionsDeviceChart = ({
	conversionsData,
}: ConversionsDeviceChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (
			!conversionsData?.payload.device_conversions ||
			conversionsData.payload.device_conversions.length === 0
		) {
			return [];
		}

		return conversionsData.payload.device_conversions
			.map(
				(
					[
						device,
						sessions,
						users,
						conversions,
						conversionValue,
						conversionRate,
					],
					index,
				) => ({
					name:
						String(device).charAt(0).toUpperCase() + String(device).slice(1),
					value: Number(conversions) || 0,
					fill: `var(--chart-${(index % 5) + 1})`,
					metadata: {
						sessions: Number(sessions) || 0,
						users: Number(users) || 0,
						conversionValue: Number(conversionValue) || 0,
						conversionRate: Number(conversionRate) || 0,
					},
				}),
			)
			.filter((item) => !Number.isNaN(item.value) && item.value > 0)
			.sort((a, b) => b.value - a.value);
	}, [conversionsData]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="Device Conversions"
			description="Conversions by device type"
			valueLabel="Conversions"
			source={conversionsData?.source}
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};
