import {
	VerticalStackedBarChart,
	type VerticalStackedBarChartData,
} from "@/components/analytics/charts/vertical-stacked-bar-chart";
import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";

interface ConversionsDailyPatternsChartProps {
	conversionsData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "conversions-breakdown" }
	> | null;
}

const DAYS_OF_WEEK = [
	{ value: 1, name: "Monday", shortName: "Mon" },
	{ value: 2, name: "Tuesday", shortName: "Tue" },
	{ value: 3, name: "Wednesday", shortName: "Wed" },
	{ value: 4, name: "Thursday", shortName: "Thu" },
	{ value: 5, name: "Friday", shortName: "Fri" },
	{ value: 6, name: "Saturday", shortName: "Sat" },
	{ value: 0, name: "Sunday", shortName: "Sun" }, // Sunday is 0 in ISO format
];

export const ConversionsDailyPatternsChart = ({
	conversionsData,
}: ConversionsDailyPatternsChartProps) => {
	const chartData = useMemo((): VerticalStackedBarChartData[] => {
		if (
			!conversionsData?.payload?.daily_conversions ||
			conversionsData.payload.daily_conversions.length === 0
		) {
			return [];
		}

		// Initialize all days with 0
		const dayActivity: Record<
			number,
			{ conversions: number; conversionValue: number }
		> = {};
		for (const day of DAYS_OF_WEEK) {
			dayActivity[day.value] = { conversions: 0, conversionValue: 0 };
		}

		// Process daily conversion data
		// Format: [day_of_week, day_name, conversions, converting_users, conversion_value_usd, avg_conversion_value]
		for (const dayData of conversionsData.payload.daily_conversions) {
			if (Array.isArray(dayData) && dayData.length >= 5) {
				const [dayOfWeek, , conversions, , conversionValue] = dayData;
				const dayNum = Number(dayOfWeek);
				const conversionsNum = Number(conversions) || 0;
				const conversionValueNum = Number(conversionValue) || 0;

				if (dayNum >= 0 && dayNum <= 6) {
					dayActivity[dayNum] = {
						conversions: conversionsNum,
						conversionValue: conversionValueNum,
					};
				}
			}
		}

		// Convert to chart data format
		return DAYS_OF_WEEK.map((dayInfo) => ({
			name: dayInfo.shortName,
			newSessions: dayActivity[dayInfo.value]?.conversions || 0,
			returningSessions: 0, // We only have total conversions, not split by new/returning for daily
		}));
	}, [conversionsData]);

	return (
		<VerticalStackedBarChart
			data={chartData}
			title="Daily Conversion Patterns"
			description="Conversions by day of week"
			dataKeys={[
				{
					key: "newSessions",
					label: "Conversions",
					color: "hsl(var(--brand))",
				},
			]}
			source={conversionsData?.source}
			showTrend={chartData.length > 0}
			maxItems={7}
			trendFormatter={(data) => {
				if (!data || data.length === 0) return null;
				const topDay = data.reduce((max, day) => {
					return Number(day.newSessions) > Number(max.newSessions) ? day : max;
				});

				if (Number(topDay.newSessions) === 0) return null;

				// Find the full day name
				const dayInfo = DAYS_OF_WEEK.find((d) => d.shortName === topDay.name);
				const fullDayName = dayInfo ? dayInfo.name : topDay.name;

				return {
					text: (
						<>
							<span className="font-medium text-emerald-500">
								{fullDayName}
							</span>{" "}
							is your best day
						</>
					),
					subtitle: `${Number(topDay.newSessions).toLocaleString()} conversions`,
				};
			}}
		/>
	);
};
