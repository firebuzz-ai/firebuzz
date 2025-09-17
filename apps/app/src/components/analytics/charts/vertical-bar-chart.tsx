"use client";

import type { Doc } from "@firebuzz/convex";
import { Icon } from "@firebuzz/ui/components/brand/icon";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@firebuzz/ui/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@firebuzz/ui/components/ui/chart";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { TrendingUp } from "@firebuzz/ui/icons/lucide";
import { capitalizeFirstLetter } from "@firebuzz/utils";
import type React from "react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export interface VerticalBarChartData {
	name: string;
	value: number;
	fill?: string;
}

interface VerticalBarChartProps {
	data: VerticalBarChartData[];
	title: string;
	description: string;
	valueLabel?: string;
	isLoading?: boolean;
	className?: string;
	source?: Doc<"analyticsPipes">["source"];
	showTrend?: boolean;
	maxItems?: number;
	valueFormatter?: (value: number) => string;
	trendFormatter?: (
		data: VerticalBarChartData[],
	) => { text: React.ReactNode; subtitle: React.ReactNode } | null;
}

export const VerticalBarChart = ({
	data,
	title,
	description,
	valueLabel = "Value",
	isLoading,
	className,
	source,
	showTrend = true,
	maxItems = 7,
	valueFormatter = (value) => value.toLocaleString(),
	trendFormatter,
}: VerticalBarChartProps) => {
	// Transform and limit data with colors based on value ranking
	const chartData = useMemo((): VerticalBarChartData[] => {
		if (!data || data.length === 0) return [];

		const limitedData = data.slice(0, maxItems);

		// Sort by value to get rankings for color assignment
		const sortedByValue = [...limitedData].sort((a, b) => b.value - a.value);

		// Create value-to-rank mapping to handle ties properly
		const uniqueValues = [...new Set(sortedByValue.map((item) => item.value))];
		const valueToRank = new Map();
		for (const [index, value] of uniqueValues.entries()) {
			valueToRank.set(value, index);
		}

		// Add colors based on value ranking
		return limitedData.map((item) => {
			const rank = valueToRank.get(item.value) || 0;
			const colorIndex = (rank % 5) + 1;
			return {
				...item,
				fill: `var(--chart-${colorIndex})`,
			};
		});
	}, [data, maxItems]);

	// Chart configuration for tooltip and legend
	const chartConfig = useMemo((): ChartConfig => {
		const config: ChartConfig = {
			value: {
				label: valueLabel,
				color: "hsl(var(--primary))",
			},
		};

		// Create value-to-rank mapping for consistent coloring
		const sortedByValue = [...chartData].sort((a, b) => b.value - a.value);
		const uniqueValues = [...new Set(sortedByValue.map((item) => item.value))];
		const valueToRank = new Map();
		for (const [index, value] of uniqueValues.entries()) {
			valueToRank.set(value, index);
		}

		for (const item of chartData) {
			const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
			const rank = valueToRank.get(item.value) || 0;
			const colorIndex = (rank % 5) + 1;

			config[key] = {
				label: item.name,
				color: `var(--chart-${colorIndex})`,
			};
		}

		return config;
	}, [chartData, valueLabel]);

	// Calculate trend data
	const trendData = useMemo(() => {
		if (trendFormatter) {
			return trendFormatter(chartData);
		}

		if (!chartData || chartData.length === 0) {
			return null;
		}

		// Default trend calculation: find item with highest value
		const topItem = chartData.reduce((max, item) => {
			return item.value > max.value ? item : max;
		});

		return {
			text: (
				<>
					<span className="font-medium text-emerald-500">
						{capitalizeFirstLetter(topItem.name)}
					</span>{" "}
					peak conversion hour
				</>
			),
			subtitle: `${valueFormatter(topItem.value)} ${valueLabel.toLowerCase()}`,
		};
	}, [chartData, trendFormatter, valueFormatter, valueLabel]);

	if (isLoading) {
		return (
			<Card className={className}>
				<CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
					<CardTitle className="text-base font-medium">{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[200px] w-full" />
				</CardContent>
			</Card>
		);
	}

	if (!chartData || chartData.length === 0) {
		return (
			<Card className="flex flex-col bg-muted">
				<CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
					<CardTitle className="text-base font-medium">{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					<div className="flex h-[200px] items-center justify-center">
						<div className="text-center">
							<p className="text-sm text-muted-foreground">No data available</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="bg-muted">
			<CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
				<CardTitle className="text-base font-medium">{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="p-0">
				<ChartContainer className="h-[200px] w-full" config={chartConfig}>
					<BarChart
						accessibilityLayer
						data={chartData}
						margin={{
							left: 16,
							right: 22,
							top: 8,
							bottom: 8,
						}}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="name"
							tickLine={false}
							tickMargin={10}
							axisLine={false}
							tickFormatter={(value) => String(value).slice(0, 3)}
						/>
						<YAxis hide />
						<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
						<Bar dataKey="value" radius={8} maxBarSize={30} />
					</BarChart>
				</ChartContainer>
			</CardContent>
			{showTrend && trendData && (
				<div className="flex justify-between items-center px-6 py-4 text-sm border-t">
					<div className="flex-col gap-2 items-start">
						<div className="flex gap-1 font-medium leading-none">
							{trendData.text} <TrendingUp className="w-4 h-4" />
						</div>
						<div className="leading-none text-muted-foreground">
							{trendData.subtitle}
						</div>
					</div>
					{source && (
						<div className="flex gap-1 items-center text-xs text-muted-foreground">
							Source:{" "}
							<div className="flex gap-1 items-center">
								<div className="flex justify-center items-center p-1 rounded-md border size-5">
									<Icon className="size-3" />
								</div>
								<span className="capitalize text-muted-foreground">
									{source}
								</span>
							</div>
						</div>
					)}
				</div>
			)}
		</Card>
	);
};
