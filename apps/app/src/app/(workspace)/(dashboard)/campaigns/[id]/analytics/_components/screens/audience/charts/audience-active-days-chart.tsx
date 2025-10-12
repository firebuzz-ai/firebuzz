import type { Doc } from "@firebuzz/convex";
import { capitalizeFirstLetter } from "@firebuzz/utils";
import { useMemo } from "react";
import {
	VerticalBarChart,
	type VerticalBarChartData,
} from "@/components/analytics/charts/vertical-bar-chart";

interface AudienceActiveDaysChartProps {
	timeseriesData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "timeseries-primitives" }
	> | null;
}

const DAYS_OF_WEEK = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
];

export const AudienceActiveDaysChart = ({
	timeseriesData,
}: AudienceActiveDaysChartProps) => {
	const chartData = useMemo((): VerticalBarChartData[] => {
		if (!timeseriesData?.payload || timeseriesData.payload.length === 0) {
			return [];
		}

		// Aggregate sessions by day of week
		const dayActivity: Record<
			string,
			{ newSessions: number; returningSessions: number }
		> = {};

		// Initialize all days with 0
		for (const day of DAYS_OF_WEEK) {
			dayActivity[day] = { newSessions: 0, returningSessions: 0 };
		}

		for (const dataPoint of timeseriesData.payload) {
			const date = new Date(dataPoint.bucket_start);
			const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

			// Convert to Monday-first index (0 = Monday, 6 = Sunday)
			const mondayFirstIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
			const dayName = DAYS_OF_WEEK[mondayFirstIndex];

			const newSessions = Number(dataPoint.new_sessions) || 0;
			const returningSessions = Number(dataPoint.returning_sessions) || 0;

			if (!Number.isNaN(newSessions) && newSessions >= 0) {
				dayActivity[dayName].newSessions += newSessions;
			}
			if (!Number.isNaN(returningSessions) && returningSessions >= 0) {
				dayActivity[dayName].returningSessions += returningSessions;
			}
		}

		// Convert to chart data format in regular week order (Monday to Sunday)
		const data = DAYS_OF_WEEK.map((day) => ({
			name: day,
			value:
				(dayActivity[day]?.newSessions || 0) +
				(dayActivity[day]?.returningSessions || 0),
		}));

		// Check if all values are 0, return empty array to show empty state
		const hasRealData = data.some((day) => day.value > 0);
		if (!hasRealData) {
			return [];
		}

		return data;
	}, [timeseriesData]);

	return (
		<VerticalBarChart
			data={chartData}
			title="Most Active Days"
			description="Total sessions by day of week"
			valueLabel="Sessions"
			source={timeseriesData?.source}
			showTrend={chartData.length > 0}
			maxItems={7}
			trendFormatter={(data) => {
				if (!data || data.length === 0) return null;
				const topDay = data.reduce((max, day) => {
					return day.value > max.value ? day : max;
				});

				return {
					text: (
						<>
							<span className="font-medium text-emerald-500">
								{capitalizeFirstLetter(topDay.name)}
							</span>{" "}
							had most sessions
						</>
					),
					subtitle: `${topDay.value.toLocaleString()} total sessions`,
				};
			}}
		/>
	);
};
