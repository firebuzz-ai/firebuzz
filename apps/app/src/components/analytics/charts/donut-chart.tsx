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
import { useMemo } from "react";
import { Label, Pie, PieChart, Sector } from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";

export interface DonutChartData {
	name: string;
	value: number;
	percentage?: number;
	fill?: string;
	metadata?: {
		sessions?: number;
		users?: number;
		conversionValue?: number;
		conversionRate?: number;
		[key: string]: number | undefined;
	};
}

interface DonutChartProps {
	data: DonutChartData[];
	title: string;
	description: string;
	valueLabel?: string;
	isLoading?: boolean;
	className?: string;
	source?: Doc<"analyticsPipes">["source"];
	showTrend?: boolean;
	isRealtime?: boolean;
	centerLabel?: string;
	centerValue?: string | number;
	headerAction?: React.ReactNode;
	activeIndex?: number;
	innerRadius?: number;
	outerRadius?: number;
}

export const DonutChart = ({
	data,
	title,
	description,
	valueLabel = "Value",
	isLoading,
	className,
	source,
	showTrend = true,
	isRealtime = false,
	centerLabel,
	centerValue,
	headerAction,
	activeIndex = 0,
	innerRadius = 50,
	outerRadius = 80,
}: DonutChartProps) => {
	// Transform data with proper fills
	const chartData = useMemo((): DonutChartData[] => {
		if (!data || data.length === 0) return [];

		return data.map((item, index) => ({
			...item,
			fill: item.fill || `var(--chart-${(index % 5) + 1})`,
		}));
	}, [data]);

	// Chart configuration for tooltip and legend
	const chartConfig = useMemo((): ChartConfig => {
		const config: ChartConfig = {
			value: {
				label: valueLabel,
				color: "hsl(var(--primary))",
			},
		};

		chartData.forEach((item, index) => {
			const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
			config[key] = {
				label: item.name,
				color: `var(--chart-${(index % 5) + 1})`,
			};
		});

		return config;
	}, [chartData, valueLabel]);

	// Calculate total value for trend calculation and center display
	const totalValue = useMemo(() => {
		return chartData.reduce((sum, item) => sum + item.value, 0);
	}, [chartData]);

	// Format center value display
	const displayCenterValue = useMemo(() => {
		if (centerValue !== undefined) {
			return typeof centerValue === "number"
				? centerValue.toLocaleString()
				: centerValue;
		}
		return totalValue.toLocaleString();
	}, [centerValue, totalValue]);

	const displayCenterLabel = centerLabel || valueLabel;

	if (isLoading) {
		return (
			<Card className={`bg-muted ${className}`}>
				<CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
					<div
						className={
							headerAction ? "flex flex-row justify-between items-start" : ""
						}
					>
						<div>
							<CardTitle className="flex gap-2 items-center text-base font-medium">
								{isRealtime && (
									<div className="flex w-2 h-2">
										<span className="inline-flex absolute w-2 h-2 bg-emerald-500 rounded-full opacity-75 animate-ping" />
										<span className="inline-flex relative w-2 h-2 bg-emerald-500 rounded-full" />
									</div>
								)}
								<Skeleton className="w-32 h-4" />
							</CardTitle>
							<CardDescription>
								<Skeleton className="mt-1 w-48 h-3" />
							</CardDescription>
						</div>
						{headerAction}
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<div className="mx-auto aspect-square max-h-[250px] flex items-center justify-center">
						<Skeleton className="h-[200px] w-[200px] rounded-full" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!chartData || chartData.length === 0) {
		return (
			<Card className={`flex flex-col bg-muted ${className}`}>
				<CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
					<div
						className={
							headerAction ? "flex flex-row justify-between items-start" : ""
						}
					>
						<div>
							<CardTitle className="text-base font-medium">{title}</CardTitle>
							<CardDescription>{description}</CardDescription>
						</div>
						{headerAction}
					</div>
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

	const topItem = chartData[0];

	return (
		<Card className={`bg-muted ${className}`}>
			<CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
				<div
					className={
						headerAction ? "flex flex-row justify-between items-start" : ""
					}
				>
					<div>
						<CardTitle className="flex gap-2 items-center text-base font-medium">
							{title}
						</CardTitle>
						<CardDescription>{description}</CardDescription>
					</div>
					{headerAction}
				</div>
			</CardHeader>
			<CardContent className="p-0">
				<ChartContainer config={chartConfig} className="h-[200px] w-full">
					<PieChart>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent hideLabel />}
						/>
						<Pie
							data={chartData}
							dataKey="value"
							nameKey="name"
							innerRadius={innerRadius}
							outerRadius={outerRadius}
							strokeWidth={5}
							activeIndex={activeIndex}
							activeShape={({
								outerRadius: activeOuterRadius = 0,
								...props
							}: PieSectorDataItem) => (
								<Sector {...props} outerRadius={activeOuterRadius + 6} />
							)}
						>
							<Label
								content={({ viewBox }) => {
									if (viewBox && "cx" in viewBox && "cy" in viewBox) {
										return (
											<text
												x={viewBox.cx}
												y={viewBox.cy}
												textAnchor="middle"
												dominantBaseline="middle"
											>
												<tspan
													x={viewBox.cx}
													y={viewBox.cy}
													className="text-3xl font-bold fill-foreground"
												>
													{displayCenterValue}
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 24}
													className="fill-muted-foreground"
												>
													{displayCenterLabel}
												</tspan>
											</text>
										);
									}
								}}
							/>
						</Pie>
					</PieChart>
				</ChartContainer>
			</CardContent>
			{showTrend && topItem && (
				<div className="flex justify-between items-center px-6 py-4 text-sm border-t">
					<div className="flex-col gap-2 items-start">
						<div className="flex gap-1 font-medium leading-none">
							<span className="font-medium text-emerald-500">
								{topItem.name}
							</span>{" "}
							{isRealtime ? "is most active" : "is the top"}{" "}
							<TrendingUp className="w-4 h-4" />
						</div>
						<div className="leading-none text-muted-foreground">
							{topItem.value.toLocaleString()} {valueLabel.toLowerCase()}
							{totalValue > topItem.value && (
								<> of {totalValue.toLocaleString()} total</>
							)}
						</div>
					</div>
					{source && (
						<div className="flex gap-1 items-center text-xs text-muted-foreground">
							Source:{" "}
							<div className="flex gap-1 items-center">
								<div className="flex justify-center items-center p-1 rounded-md border size-5">
									<Icon
										name="tinybird"
										className="size-3 text-muted-foreground"
									/>
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
