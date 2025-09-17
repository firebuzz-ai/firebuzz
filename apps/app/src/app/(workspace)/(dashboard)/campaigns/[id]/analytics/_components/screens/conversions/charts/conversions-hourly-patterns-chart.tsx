import {
	VerticalStackedBarChart,
	type VerticalStackedBarChartData,
} from "@/components/analytics/charts/vertical-stacked-bar-chart";
import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";

interface ConversionsHourlyPatternsChartProps {
	conversionsData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "conversions-breakdown" }
	> | null;
}

const HOURS_OF_DAY = Array.from({ length: 24 }, (_, i) => {
	const hour = i;
	const displayHour = hour.toString().padStart(2, "0");
	return {
		value: hour,
		label: `${displayHour}:00`,
		shortLabel: displayHour,
	};
});

export const ConversionsHourlyPatternsChart = ({
	conversionsData,
}: ConversionsHourlyPatternsChartProps) => {
	const chartData = useMemo((): VerticalStackedBarChartData[] => {
		if (
			!conversionsData?.payload?.hourly_conversions ||
			conversionsData.payload.hourly_conversions.length === 0
		) {
			return [];
		}

		// Initialize all hours with 0
		const hourActivity: Record<
			number,
			{ conversions: number; conversionValue: number }
		> = {};
		for (let i = 0; i < 24; i++) {
			hourActivity[i] = { conversions: 0, conversionValue: 0 };
		}

		// Process hourly conversion data
		// Format: [hour, conversions, converting_users, conversion_value_usd, avg_conversion_value]
		for (const hourData of conversionsData.payload.hourly_conversions) {
			if (Array.isArray(hourData) && hourData.length >= 4) {
				const [hour, conversions, , conversionValue] = hourData;
				const hourNum = Number(hour);
				const conversionsNum = Number(conversions) || 0;
				const conversionValueNum = Number(conversionValue) || 0;

				if (hourNum >= 0 && hourNum <= 23) {
					hourActivity[hourNum] = {
						conversions: conversionsNum,
						conversionValue: conversionValueNum,
					};
				}
			}
		}

		// Convert to chart data format
		return HOURS_OF_DAY.map((hourInfo) => ({
			name: hourInfo.shortLabel,
			newSessions: hourActivity[hourInfo.value]?.conversions || 0,
			returningSessions: 0, // We only have total conversions, not split by new/returning for hourly
		}));
	}, [conversionsData]);

	return (
		<VerticalStackedBarChart
			data={chartData}
			title="Hourly Conversion Patterns"
			description="Conversions by hour of day"
			dataKeys={[
				{
					key: "newSessions",
					label: "Conversions",
					color: "hsl(var(--brand))",
				},
			]}
			source={conversionsData?.source}
			showTrend={chartData.length > 0}
			maxItems={24}
			trendFormatter={(data) => {
				if (!data || data.length === 0) return null;
				const topHour = data.reduce((max, hour) => {
					return Number(hour.newSessions) > Number(max.newSessions)
						? hour
						: max;
				});

				if (Number(topHour.newSessions) === 0) return null;

				// Convert back to readable hour format
				const hourIndex = HOURS_OF_DAY.findIndex(
					(h) => h.shortLabel === topHour.name,
				);
				const hourInfo = HOURS_OF_DAY[hourIndex];
				const readableHour = hourInfo ? hourInfo.label : topHour.name;

				return {
					text: (
						<>
							<span className="font-medium text-emerald-500">
								{readableHour}
							</span>{" "}
							peak conversion hour
						</>
					),
					subtitle: `${Number(topHour.newSessions).toLocaleString()} conversions`,
				};
			}}
		/>
	);
};
