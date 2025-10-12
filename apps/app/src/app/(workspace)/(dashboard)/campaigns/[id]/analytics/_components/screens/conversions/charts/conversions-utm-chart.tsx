"use client";

import type { Doc } from "@firebuzz/convex";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { useMemo, useState } from "react";
import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";

interface ConversionsUtmChartProps {
	conversionsData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "conversions-breakdown" }
	> | null;
}

type UtmType = "source" | "medium" | "campaign";

const UTM_OPTIONS: Array<{
	value: UtmType;
	label: string;
	description: string;
}> = [
	{
		value: "source",
		label: "Source",
		description: "Traffic source (Google, Facebook, etc.)",
	},
	{
		value: "medium",
		label: "Medium",
		description: "Marketing medium (CPC, email, social, etc.)",
	},
	{ value: "campaign", label: "Campaign", description: "Campaign name" },
];

export const ConversionsUtmChart = ({
	conversionsData,
}: ConversionsUtmChartProps) => {
	const [selectedUtm, setSelectedUtm] = useState<UtmType>("source");

	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (!conversionsData?.payload) {
			return [];
		}

		let utmData: Array<(string | number)[]> = [];

		switch (selectedUtm) {
			case "source":
				utmData = conversionsData.payload.utm_source_conversions || [];
				break;
			case "medium":
				utmData = conversionsData.payload.utm_medium_conversions || [];
				break;
			case "campaign":
				utmData = conversionsData.payload.utm_campaign_conversions || [];
				break;
		}

		return utmData
			.map(
				(
					[name, sessions, users, conversions, conversionValue, conversionRate],
					index,
				) => ({
					name: String(name) || "Direct",
					value: Number(conversions) || 0,
					fill: `var(--chart-${(index % 5) + 1})`,
					metadata: {
						sessions: Number(sessions) || 0,
						users: Number(users) || 0,
						conversionValue: Number(conversionValue) || 0,
						conversionRate: Number(conversionRate) || 0,
					},
				}),
			)
			.filter((item) => !Number.isNaN(item.value) && item.value > 0)
			.sort((a, b) => b.value - a.value);
	}, [conversionsData, selectedUtm]);

	const selectedOption = UTM_OPTIONS.find(
		(option) => option.value === selectedUtm,
	);

	const headerAction = (
		<Select
			value={selectedUtm}
			onValueChange={(value: UtmType) => setSelectedUtm(value)}
		>
			<SelectTrigger className="w-[150px] h-8">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{UTM_OPTIONS.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);

	return (
		<HorizontalBarChart
			data={chartData}
			title="UTM Conversions"
			description={`Conversions by ${selectedOption?.label.toLowerCase() || "UTM parameter"}`}
			valueLabel="Conversions"
			source={conversionsData?.source}
			showTrend={chartData.length > 0}
			maxItems={5}
			headerAction={headerAction}
		/>
	);
};
