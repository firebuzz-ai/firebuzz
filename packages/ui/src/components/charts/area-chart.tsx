"use client";

import { format, parseISO } from "date-fns";
import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { cn } from "../../lib/utils";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "../ui/chart";

export interface AreaChartDataPoint {
	timestamp: string; // ISO date string or bucket_label
	[key: string]: string | number; // Additional data fields
}

export interface AreaChartDataset {
	key: string; // Key in data object
	label: string; // Display name
	color: string; // Color for this dataset
	strokeWidth?: number; // Line thickness (default: 2)
	fillOpacity?: number; // Fill opacity (default: 0.2)
}

export interface AreaChartProps {
	data: AreaChartDataPoint[];
	datasets: AreaChartDataset[]; // Up to 3 datasets
	height?: number;
	className?: string;
	showLegend?: boolean;
	showGrid?: boolean;
	showXAxis?: boolean;
	showYAxis?: boolean;
	timeFormat?: string; // Format for x-axis labels
	yAxisWidth?: number;
	legendPosition?: "top" | "bottom" | "right";
	tooltipFormatter?: (value: any, name: any) => React.ReactNode;
	labelFormatter?: (value: string) => React.ReactNode;
	onDataPointClick?: (data: AreaChartDataPoint, datasetKey: string) => void;
	tooltipIndicator?: "dot" | "line" | "dashed";
}

export const AreaChartComponent = React.forwardRef<
	HTMLDivElement,
	AreaChartProps
>(
	(
		{
			data,
			datasets,
			height = 350,
			className,
			showLegend = true,
			showGrid = true,
			showXAxis = true,
			showYAxis = true,
			timeFormat = "MMM dd",
			yAxisWidth = 60,
			legendPosition = "right",
			tooltipFormatter,
			labelFormatter,
			onDataPointClick,
			tooltipIndicator = "dot",
		},
		ref,
	) => {
		// Limit to 3 datasets maximum
		const limitedDatasets = React.useMemo(
			() => datasets.slice(0, 3),
			[datasets],
		);

		// Build chart config from datasets
		const chartConfig = React.useMemo((): ChartConfig => {
			const config: ChartConfig = {};

			limitedDatasets.forEach((dataset) => {
				config[dataset.key] = {
					label: dataset.label,
					color: dataset.color,
				};
			});

			return config;
		}, [limitedDatasets]);

		// Format data for recharts - ensure timestamp is properly formatted
		const chartData = React.useMemo(() => {
			return data.map((point) => {
				let formattedTimestamp = point.timestamp;

				// Try to parse and format timestamp if it looks like ISO date
				try {
					if (point.timestamp.includes("T") || point.timestamp.includes("-")) {
						const date = parseISO(point.timestamp);
						formattedTimestamp = format(date, timeFormat);
					}
				} catch {
					// If parsing fails, use original timestamp
				}

				return {
					...point,
					formattedTimestamp,
				};
			});
		}, [data, timeFormat]);

		// Custom tooltip formatter
		const defaultTooltipFormatter = React.useCallback(
			(value: any, name: any) => {
				if (tooltipFormatter) {
					return tooltipFormatter(value, name);
				}
				// Handle both string and number values
				if (typeof value === "number") {
					return value.toLocaleString();
				}
				return String(value);
			},
			[tooltipFormatter],
		);

		// Custom label formatter for tooltip
		const defaultLabelFormatter = React.useCallback(
			(value: string) => {
				if (labelFormatter) {
					return labelFormatter(value);
				}
				return value;
			},
			[labelFormatter],
		);

		const handleClick = React.useCallback(
			(data: any, dataKey: string) => {
				if (onDataPointClick) {
					onDataPointClick(data, dataKey);
				}
			},
			[onDataPointClick],
		);

		const legendContent =
			showLegend && legendPosition !== "right" ? (
				<ChartLegend
					content={<ChartLegendContent />}
					verticalAlign={legendPosition}
				/>
			) : null;

		const rightLegendContent =
			showLegend && legendPosition === "right" ? (
				<div className="flex flex-col justify-center gap-2 ml-4">
					{limitedDatasets.map((dataset) => (
						<div key={dataset.key} className="flex items-center gap-2 text-sm">
							<div
								className="h-2 w-2 rounded-full"
								style={{ backgroundColor: dataset.color }}
							/>
							<span className="text-muted-foreground">{dataset.label}</span>
						</div>
					))}
				</div>
			) : null;

		return (
			<div ref={ref} className={cn("w-full", className)}>
				<div
					className={cn("flex w-full", legendPosition === "right" && "gap-4")}
				>
					<ChartContainer
						config={chartConfig}
						className={cn(
							"aspect-auto w-full",
							`h-[${height}px]`,
							legendPosition === "right" && "min-w-0",
						)}
					>
						<AreaChart data={chartData} onClick={handleClick}>
							{showGrid && (
								<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
							)}

							{showXAxis && (
								<XAxis
									dataKey="formattedTimestamp"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									minTickGap={32}
									tick={{ fontSize: 12 }}
									className="fill-muted-foreground"
								/>
							)}

							{showYAxis && (
								<YAxis
									width={yAxisWidth}
									tick={{ fontSize: 12 }}
									tickLine={false}
									axisLine={false}
									className="fill-muted-foreground"
								/>
							)}

							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										labelFormatter={defaultLabelFormatter}
										indicator={tooltipIndicator}
									/>
								}
							/>

							{legendContent}

							{limitedDatasets.map((dataset) => (
								<Area
									key={dataset.key}
									type="monotone"
									dataKey={dataset.key}
									stroke={dataset.color}
									strokeWidth={dataset.strokeWidth || 2}
									fill={dataset.color}
									fillOpacity={dataset.fillOpacity || 0.2}
									connectNulls={false}
								/>
							))}
						</AreaChart>
					</ChartContainer>

					{rightLegendContent}
				</div>
			</div>
		);
	},
);

AreaChartComponent.displayName = "AreaChart";

// Export types for consumers
export type { ChartConfig };
