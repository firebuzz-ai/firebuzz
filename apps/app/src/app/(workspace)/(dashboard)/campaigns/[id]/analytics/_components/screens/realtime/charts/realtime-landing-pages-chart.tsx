import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";
import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";

interface RealtimeLandingPagesChartProps {
	data: Extract<Doc<"analyticsPipes">, { queryId: "realtime-overview" }>;
	landingPagesData?: Doc<"landingPages">[] | null;
}

export const RealtimeLandingPagesChart = ({
	data,
	landingPagesData,
}: RealtimeLandingPagesChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (
			!data.payload.top_landing_pages ||
			data.payload.top_landing_pages.length === 0
		) {
			return [];
		}

		return data.payload.top_landing_pages.map(([page, count], index) => {
			// Try to find the landing page by ID first
			const pageId = String(page);
			const landingPage = landingPagesData?.find((lp) => lp._id === pageId);

			let pageName: string;
			if (landingPage?.title) {
				// Use actual landing page title if found
				pageName = landingPage.title;
			} else {
				// Fallback to URL path parsing for external pages or when no match found
				const parts = pageId.split("/");
				pageName = parts[parts.length - 1] || pageId;
			}

			return {
				name: pageName,
				value: Number(count),
				fill: `var(--chart-${(index % 5) + 1})`,
			};
		});
	}, [data, landingPagesData]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="Top Landing Pages"
			description="Pages with current visitor activity"
			valueLabel="Sessions"
			source={data.source}
			isRealtime
			showTrend={chartData.length > 0}
			maxItems={5}
			className="lg:col-span-2"
		/>
	);
};