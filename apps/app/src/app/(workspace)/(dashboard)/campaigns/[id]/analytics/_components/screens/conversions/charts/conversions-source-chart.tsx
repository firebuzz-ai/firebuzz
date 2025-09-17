"use client";

import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";
import type { Doc } from "@firebuzz/convex";

interface ConversionsSourceChartProps {
	conversionsData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "conversions-breakdown" }
	> | null;
}

export const ConversionsSourceChart = ({
	conversionsData,
}: ConversionsSourceChartProps) => {
	const chartData: HorizontalBarChartData[] = (() => {
		if (!conversionsData?.payload?.utm_source_conversions) {
			return [];
		}

		// Use UTM source data but filter to show main traffic sources
		return conversionsData.payload.utm_source_conversions
			.map(
				(
					[name, sessions, users, conversions, conversionValue, conversionRate],
					index,
				) => {
					// Clean up source names for better display
					let displayName = String(name) || "Direct";
					if (displayName.toLowerCase().includes("google"))
						displayName = "Google";
					else if (displayName.toLowerCase().includes("facebook"))
						displayName = "Facebook";
					else if (displayName.toLowerCase().includes("twitter"))
						displayName = "Twitter";
					else if (displayName.toLowerCase().includes("linkedin"))
						displayName = "LinkedIn";
					else if (displayName.toLowerCase().includes("instagram"))
						displayName = "Instagram";
					else if (displayName.toLowerCase().includes("youtube"))
						displayName = "YouTube";
					else if (displayName === "Direct") displayName = "Direct";
					else if (displayName.length > 20)
						displayName = `${displayName.substring(0, 20)}...`;

					return {
						name: displayName,
						value: Number(conversions) || 0,
						fill: `var(--chart-${(index % 5) + 1})`,
						metadata: {
							sessions: Number(sessions) || 0,
							users: Number(users) || 0,
							conversionValue: Number(conversionValue) || 0,
							conversionRate: Number(conversionRate) || 0,
						},
					};
				},
			)
			.filter((item) => !Number.isNaN(item.value) && item.value > 0)
			.sort((a, b) => b.value - a.value);
	})();

	return (
		<HorizontalBarChart
			data={chartData}
			title="Traffic Source Conversions"
			description="Conversions by traffic source"
			valueLabel="Conversions"
			source={conversionsData?.source}
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};
