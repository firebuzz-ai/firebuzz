import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";
import { WorldMapChart } from "@/components/analytics/charts/world-map-chart";

interface ConversionsGeographicChartProps {
	conversionsData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "conversions-breakdown" }
	> | null;
}

export const ConversionsGeographicChart = ({
	conversionsData,
}: ConversionsGeographicChartProps) => {
	const geographicData = useMemo(() => {
		if (!conversionsData?.payload.geographic_conversions) {
			return [];
		}

		// Transform the geographic conversions data for the world map
		// Format: [country, sessions, users, conversions, conversion_value_usd, conversion_rate, new_user_conversions, returning_user_conversions]
		return conversionsData.payload.geographic_conversions.map(
			([country, _sessions, _users, conversions]) => [
				String(country),
				Number(conversions) || 0,
			],
		) as [string, number][];
	}, [conversionsData]);

	return (
		<WorldMapChart
			data={geographicData}
			title="Conversions by Country"
			description="Geographic distribution of conversions"
			source={conversionsData?.source}
			footerText="countries converted"
		/>
	);
};
