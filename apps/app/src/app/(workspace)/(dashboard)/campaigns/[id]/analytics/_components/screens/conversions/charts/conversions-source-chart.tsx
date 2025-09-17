"use client";

import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";
import type { Doc } from "@firebuzz/convex";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { useMemo, useState } from "react";

interface ConversionsSourceChartProps {
	conversionsData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "conversions-breakdown" }
	> | null;
}

type SourceType = "source" | "referrer";

const SOURCE_OPTIONS: Array<{
	value: SourceType;
	label: string;
	description: string;
}> = [
	{
		value: "source",
		label: "Source",
		description: "Traffic source (google.com, facebook.com, etc.)",
	},
	{
		value: "referrer",
		label: "Referrer",
		description: "Referring website or page",
	},
];

export const ConversionsSourceChart = ({
	conversionsData,
}: ConversionsSourceChartProps) => {
	const [selectedSource, setSelectedSource] = useState<SourceType>("source");

	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (!conversionsData?.payload) {
			return [];
		}

		let sourceData: Array<(string | number)[]> = [];

		switch (selectedSource) {
			case "source":
				sourceData = conversionsData.payload.source_conversions || [];
				break;
			case "referrer":
				sourceData = conversionsData.payload.referrer_conversions || [];
				break;
		}

		return sourceData
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
	}, [conversionsData, selectedSource]);

	const selectedOption = SOURCE_OPTIONS.find(
		(option) => option.value === selectedSource,
	);

	const headerAction = (
		<Select
			value={selectedSource}
			onValueChange={(value: SourceType) => setSelectedSource(value)}
		>
			<SelectTrigger className="w-[150px] h-8">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{SOURCE_OPTIONS.map((option) => (
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
			title="Source Conversions"
			description={`Conversions by ${selectedOption?.label.toLowerCase() || "source"}`}
			valueLabel="Conversions"
			source={conversionsData?.source}
			showTrend={chartData.length > 0}
			maxItems={5}
			headerAction={headerAction}
		/>
	);
};
