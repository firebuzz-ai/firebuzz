import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";
import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";

interface AudienceTimezonesChartProps {
	audienceData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "audience-breakdown" }
	> | null;
	timeseriesData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "timeseries-primitives" }
	> | null;
}

// Map hours to common timezone labels
const getTimezoneFromHour = (hour: number): string => {
	// This is a simplified mapping - in reality, timezones are more complex
	// but this gives us a reasonable approximation for analytics display
	const timezones = [
		"UTC-12",
		"UTC-11",
		"UTC-10",
		"UTC-9 (Alaska)",
		"UTC-8 (Pacific)",
		"UTC-7 (Mountain)",
		"UTC-6 (Central)",
		"UTC-5 (Eastern)",
		"UTC-4 (Atlantic)",
		"UTC-3 (Argentina)",
		"UTC-2",
		"UTC-1",
		"UTC+0 (GMT)",
		"UTC+1 (CET)",
		"UTC+2 (EET)",
		"UTC+3 (Moscow)",
		"UTC+4",
		"UTC+5",
		"UTC+6",
		"UTC+7",
		"UTC+8 (China)",
		"UTC+9 (Japan)",
		"UTC+10 (Australia)",
		"UTC+11",
	];

	return timezones[hour] || `UTC+${hour - 12}`;
};

export const AudienceTimezonesChart = ({
	audienceData,
	timeseriesData,
}: AudienceTimezonesChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		// Use real timezones data from audience breakdown first
		if (
			audienceData?.payload.timezones &&
			audienceData.payload.timezones.length > 0
		) {
			return audienceData.payload.timezones
				.map(([timezone, sessions], index) => ({
					name: String(timezone),
					value: Number(sessions) || 0,
					fill: `var(--chart-${(index % 5) + 1})`,
				}))
				.filter((item) => !Number.isNaN(item.value) && item.value > 0)
				.sort((a, b) => b.value - a.value);
		}

		// Fallback: Try to get hourly distribution from audience data
		if (
			audienceData?.payload.hourly_distribution &&
			audienceData.payload.hourly_distribution.length > 0
		) {
			// Convert hourly distribution to timezone approximation
			const timezoneData: Record<string, number> = {};

			for (const [hour, count] of audienceData.payload.hourly_distribution) {
				const timezone = getTimezoneFromHour(Number(hour));
				const sessions = Number(count) || 0;
				if (!Number.isNaN(sessions) && sessions > 0) {
					timezoneData[timezone] = (timezoneData[timezone] || 0) + sessions;
				}
			}

			return Object.entries(timezoneData)
				.map(([timezone, count], index) => ({
					name: timezone,
					value: count,
					fill: `var(--chart-${(index % 5) + 1})`,
				}))
				.sort((a, b) => b.value - a.value);
		}

		// Fallback to deriving timezone info from timeseries data
		if (timeseriesData?.payload && timeseriesData.payload.length > 0) {
			const hourlyActivity: Record<number, number> = {};

			// Aggregate sessions by hour of day from timeseries
			for (const dataPoint of timeseriesData.payload) {
				const date = new Date(dataPoint.bucket_start);
				const hour = date.getUTCHours();
				hourlyActivity[hour] =
					(hourlyActivity[hour] || 0) + dataPoint.all_sessions;
			}

			// Convert to timezone approximation
			const timezoneData: Record<string, number> = {};
			for (const [hour, count] of Object.entries(hourlyActivity)) {
				const timezone = getTimezoneFromHour(Number(hour));
				const sessions = Number(count) || 0;
				if (!Number.isNaN(sessions) && sessions > 0) {
					timezoneData[timezone] = (timezoneData[timezone] || 0) + sessions;
				}
			}

			return Object.entries(timezoneData)
				.map(([timezone, count], index) => ({
					name: timezone,
					value: count,
					fill: `var(--chart-${(index % 5) + 1})`,
				}))
				.sort((a, b) => b.value - a.value);
		}

		return [];
	}, [audienceData, timeseriesData]);

	const source = audienceData?.source || timeseriesData?.source || "firebuzz";

	return (
		<HorizontalBarChart
			data={chartData}
			title="Top 5 Timezones"
			description="Activity distribution across timezones"
			valueLabel="Sessions"
			source={source}
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};
