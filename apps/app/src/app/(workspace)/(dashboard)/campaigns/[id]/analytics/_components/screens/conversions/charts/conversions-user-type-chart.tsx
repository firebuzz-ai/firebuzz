"use client";

import {
	DonutChart,
	type DonutChartData,
} from "@/components/analytics/charts/donut-chart";
import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";

interface ConversionsUserTypeChartProps {
	conversionsData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "conversions-breakdown" }
	> | null;
}

export const ConversionsUserTypeChart = ({
	conversionsData,
}: ConversionsUserTypeChartProps) => {
	const chartData = useMemo((): DonutChartData[] => {
		if (!conversionsData?.payload?.user_type_conversions) {
			return [];
		}

		return conversionsData.payload.user_type_conversions
			.map(
				(
					[
						userType,
						sessions,
						users,
						conversions,
						conversionValue,
						conversionRate,
					],
					index,
				) => ({
					name: `${String(userType).charAt(0).toUpperCase()}${String(userType).slice(1)} Users`,
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
			title="User Type Conversions"
			description="Conversions by new vs returning users"
			valueLabel="Conversions"
			source={conversionsData?.source}
			showTrend={chartData.length > 0}
			centerLabel="Total"
		/>
	);
};
