import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";
import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";

interface ConversionsValueDistributionChartProps {
	conversionsData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "conversions-breakdown" }
	> | null;
}

export const ConversionsValueDistributionChart = ({
	conversionsData,
}: ConversionsValueDistributionChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (
			!conversionsData?.payload.value_distribution ||
			conversionsData.payload.value_distribution.length === 0
		) {
			return [];
		}

		return conversionsData.payload.value_distribution
			.map(
				(
					[valueRange, conversions, convertingUsers, totalValue, avgValue],
					index,
				) => ({
					name: String(valueRange) || "Unknown Range",
					value: Number(conversions) || 0,
					fill: `var(--chart-${(index % 5) + 1})`,
					metadata: {
						convertingUsers: Number(convertingUsers) || 0,
						totalValue: Number(totalValue) || 0,
						avgValue: Number(avgValue) || 0,
					},
				}),
			)
			.filter((item) => !Number.isNaN(item.value) && item.value > 0)
			.sort((a, b) => b.value - a.value);
	}, [conversionsData]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="Conversion Value Distribution"
			description="Conversion volume by value ranges"
			valueLabel="Conversions"
			source={conversionsData?.source}
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};
