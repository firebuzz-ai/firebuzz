import type { Doc } from "@firebuzz/convex";
import { DEFAULT_CAMPAIGN_EVENTS } from "@firebuzz/utils";
import { useMemo } from "react";
import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";

interface RealtimeEventsChartProps {
	data: Extract<Doc<"analyticsPipes">, { queryId: "realtime-overview" }>;
	campaign?: Doc<"campaigns"> | null;
}

export const RealtimeEventsChart = ({
	data,
	campaign,
}: RealtimeEventsChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (!data.payload.top_events || data.payload.top_events.length === 0) {
			return [];
		}

		const customEvents = campaign?.campaignSettings?.customEvents || [];

		return data.payload.top_events.map(([event, count], index) => {
			// Try to find the custom event first, then check default events
			const eventId = String(event);
			const customEvent = customEvents.find((ce) => ce.id === eventId);
			const defaultEvent = DEFAULT_CAMPAIGN_EVENTS.find(
				(de) => de.id === eventId,
			);

			let displayName: string;
			let iconName: string;

			if (customEvent?.title) {
				displayName = customEvent.title;
				iconName = customEvent.icon;
			} else if (defaultEvent?.title) {
				displayName = defaultEvent.title;
				iconName = defaultEvent.icon;
			} else {
				// Use the event ID as fallback, formatted nicely
				displayName = eventId
					.replace(/-/g, " ")
					.replace(/\b\w/g, (l: string) => l.toUpperCase());
				iconName = eventId;
			}

			return {
				name: displayName,
				value: Number(count),
				fill: `var(--chart-${(index % 5) + 1})`,
				// Store the icon name for icon lookup
				originalEvent: iconName,
			};
		});
	}, [data, campaign]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="Recent Events"
			description="Latest events from your campaign"
			valueLabel="Events"
			source={data.source}
			isRealtime
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};
