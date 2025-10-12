import type { Doc } from "@firebuzz/convex";
import { WorldMapChart } from "@/components/analytics/charts/world-map-chart";

interface RealtimeWorldMapChartProps {
	data: Extract<Doc<"analyticsPipes">, { queryId: "realtime-overview" }>;
}

export const RealtimeWorldMapChart = ({ data }: RealtimeWorldMapChartProps) => {
	return (
		<WorldMapChart
			data={(data.payload.countries || []) as string[] | [string, number][]}
			title="Active Countries"
			description="Countries with current visitor activity"
			source={data.source}
			isRealtime
		/>
	);
};
