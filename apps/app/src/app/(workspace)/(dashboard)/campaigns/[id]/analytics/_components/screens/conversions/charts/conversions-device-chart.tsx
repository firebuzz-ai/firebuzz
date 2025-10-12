"use client";

import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";
import {
	DonutChart,
	type DonutChartData,
} from "@/components/analytics/charts/donut-chart";

interface ConversionsDeviceChartProps {
	conversionsData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "conversions-breakdown" }
	> | null;
}

export const ConversionsDeviceChart = ({
	conversionsData,
}: ConversionsDeviceChartProps) => {
	const chartData = useMemo((): DonutChartData[] => {
		if (!conversionsData?.payload?.device_conversions) {
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
		<DonutChart
			data={chartData}
			title="Device Conversions"
			description="Conversions by device type"
			valueLabel="Conversions"
			source={conversionsData?.source}
			showTrend={chartData.length > 0}
			centerLabel="Total"
		/>
	);
};
