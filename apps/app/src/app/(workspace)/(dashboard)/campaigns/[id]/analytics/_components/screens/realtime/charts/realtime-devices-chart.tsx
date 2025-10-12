import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";
import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";

interface RealtimeDevicesChartProps {
	data: Extract<Doc<"analyticsPipes">, { queryId: "realtime-overview" }>;
}

export const RealtimeDevicesChart = ({ data }: RealtimeDevicesChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (!data.payload.devices || data.payload.devices.length === 0) {
			return [];
		}

		return data.payload.devices.map(([device, count], index) => ({
			name: String(device).charAt(0).toUpperCase() + String(device).slice(1),
			value: Number(count), // Now we have actual session counts
			fill: `var(--chart-${(index % 5) + 1})`,
		}));
	}, [data]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="Active Devices"
			description="Device types with current activity"
			valueLabel="Sessions"
			source={data.source}
			isRealtime
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};
