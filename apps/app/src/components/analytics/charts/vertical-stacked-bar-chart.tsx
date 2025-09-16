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
import { useMemo } from "react";
import type React from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

export interface VerticalStackedBarChartData {
	name: string;
	newSessions: number;
	returningSessions: number;
	[key: string]: string | number;
}

interface VerticalStackedBarChartProps {
	data: VerticalStackedBarChartData[];
	title: string;
	description: string;
	dataKeys: Array<{
		key: string;
		label: string;
		color?: string;
	}>;
	isLoading?: boolean;
	className?: string;
	source?: Doc<"analyticsPipes">["source"];
	showTrend?: boolean;
	maxItems?: number;
	valueFormatter?: (value: number) => string;
	trendFormatter?: (
		data: VerticalStackedBarChartData[],
		dataKeys: Array<{ key: string; label: string; color?: string }>,
	) => { text: React.ReactNode; subtitle: React.ReactNode } | null;
}

export const VerticalStackedBarChart = ({
	data,
	title,
	description,
	dataKeys,
	isLoading,
	className,
	source,
	showTrend = true,
	maxItems = 7,
	valueFormatter = (value) => value.toLocaleString(),
	trendFormatter,
}: VerticalStackedBarChartProps) => {
	// Transform and limit data
	const chartData = useMemo((): VerticalStackedBarChartData[] => {
		if (!data || data.length === 0) return [];

		return data.slice(0, maxItems);
	}, [data, maxItems]);

	// Chart configuration for tooltip and legend
	const chartConfig = useMemo((): ChartConfig => {
		const config: ChartConfig = {};

		// Add data key configurations
		for (const [index, dataKey] of dataKeys.entries()) {
			config[dataKey.key] = {
				label: dataKey.label,
				color:
					dataKey.color ||
					(index === 0
						? "hsl(142 71% 45%)"
						: index === 1
							? "hsl(var(--brand))"
							: `hsl(var(--chart-${(index % 5) + 1}))`),
			};
		}

		// Add individual item colors for better tooltip experience
		for (const [index, item] of chartData.entries()) {
			const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
			config[key] = {
				label: item.name,
				color: `hsl(var(--chart-${(index % 5) + 1}))`,
			};
		}

		return config;
	}, [chartData, dataKeys]);

	// Calculate trend data
	const trendData = useMemo(() => {
		if (trendFormatter) {
			return trendFormatter(chartData, dataKeys);
		}

		if (!chartData || chartData.length === 0) {
			return null;
		}

		// Default trend calculation: find item with highest total value
		const topItem = chartData.reduce((max, item) => {
			const itemTotal = dataKeys.reduce(
				(sum, key) => sum + (Number(item[key.key]) || 0),
				0,
			);
			const maxTotal = dataKeys.reduce(
				(sum, key) => sum + (Number(max[key.key]) || 0),
				0,
			);
			return itemTotal > maxTotal ? item : max;
		});

		const total = dataKeys.reduce(
			(sum, key) => sum + (Number(topItem[key.key]) || 0),
			0,
		);
		const breakdown = dataKeys
			.map(
				(key) =>
					`${valueFormatter(Number(topItem[key.key]) || 0)} ${key.label.toLowerCase()}`,
			)
			.join(", ");

		return {
			text: (
				<>
					<span className="font-medium text-emerald-500">
						{capitalizeFirstLetter(String(topItem.name))}
					</span>{" "}
					had most activity
				</>
			),
			subtitle: `${valueFormatter(total)} total (${breakdown})`,
		};
	}, [chartData, dataKeys, trendFormatter, valueFormatter]);

	if (isLoading) {
		return (
			<Card className={className}>
				<CardHeader>
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
						{dataKeys.map((dataKey) => (
							<Bar
								key={dataKey.key}
								dataKey={dataKey.key}
								stackId="stack"
								fill={`var(--color-${dataKey.key})`}
							>
								{chartData.map((entry) => {
									// Find which segments have data for this entry
									const segmentsWithData = dataKeys.filter(
										(key) => Number(entry[key.key]) > 0,
									);

									if (segmentsWithData.length === 0) {
										return <Cell key={`cell-${entry.name}-${dataKey.key}`} />;
									}

									const hasData = Number(entry[dataKey.key]) > 0;
									if (!hasData) {
										return <Cell key={`cell-${entry.name}-${dataKey.key}`} />;
									}

									const isOnlySegmentWithData = segmentsWithData.length === 1;
									const isFirstSegmentWithData =
										segmentsWithData[0]?.key === dataKey.key;
									const isLastSegmentWithData =
										segmentsWithData[segmentsWithData.length - 1]?.key ===
										dataKey.key;

									let radius: [number, number, number, number] = [0, 0, 0, 0];

									if (isOnlySegmentWithData) {
										radius = [4, 4, 4, 4]; // All corners rounded when it's the only segment
									} else if (isFirstSegmentWithData) {
										radius = [0, 0, 4, 4]; // Bottom corners rounded for first segment with data
									} else if (isLastSegmentWithData) {
										radius = [4, 4, 0, 0]; // Top corners rounded for last segment with data
									}

									return (
										<Cell
											key={`cell-${entry.name}-${dataKey.key}`}
											{...({ radius } as Record<string, unknown>)}
										/>
									);
								})}
							</Bar>
						))}
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
