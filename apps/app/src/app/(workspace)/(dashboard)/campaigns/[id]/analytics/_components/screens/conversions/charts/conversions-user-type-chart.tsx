import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";
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
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (
			!conversionsData?.payload?.user_type_conversions ||
			conversionsData.payload.user_type_conversions.length === 0
		) {
			return [];
		}

		// Process user type conversion data and create horizontal bar chart data
		// Format: [user_type, sessions, users, conversions, conversion_value_usd, conversion_rate]
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
					fill: index === 0 ? "hsl(142 71% 45%)" : "hsl(var(--brand))", // Green for new, brand color for returning
					metadata: {
						sessions: Number(sessions) || 0,
						users: Number(users) || 0,
						conversionValue: Number(conversionValue) || 0,
						conversionRate: Number(conversionRate) || 0,
					},
				}),
			)
			.filter((item) => !Number.isNaN(item.value) && item.value >= 0)
			.sort((a, b) => b.value - a.value);
	}, [conversionsData]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="User Type Conversions"
			description="Conversions by new vs returning users"
			valueLabel="Conversions"
			source={conversionsData?.source}
			showTrend={chartData.length > 0}
			maxItems={2}
		/>
	);
};
