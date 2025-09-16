import {
	VerticalStackedBarChart,
	type VerticalStackedBarChartData,
} from "@/components/analytics/charts/vertical-stacked-bar-chart";
import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";

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
	const chartData = useMemo((): VerticalStackedBarChartData[] => {
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
		return DAYS_OF_WEEK.map((day) => ({
			name: day,
			newSessions: dayActivity[day]?.newSessions || 0,
			returningSessions: dayActivity[day]?.returningSessions || 0,
		}));
	}, [timeseriesData]);

	return (
		<VerticalStackedBarChart
			data={chartData}
			title="Most Active Days"
			description="New vs returning sessions by day of week"
			source={timeseriesData?.source}
			showTrend={chartData.length > 0}
			maxItems={7}
		/>
	);
};
