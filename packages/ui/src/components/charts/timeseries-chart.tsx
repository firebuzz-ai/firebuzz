"use client";

import { useMemo } from "react";
import type { AreaChartDataPoint, AreaChartDataset } from "./area-chart";
import { AreaChartComponent } from "./area-chart";

// Helper function to convert data to cumulative timeseries
const convertToCumulativeData = (
	data: TimeseriesDataPoint[],
	dataKeys: string[],
): TimeseriesDataPoint[] => {
	const cumulativeData: TimeseriesDataPoint[] = [];
	const cumulativeTotals: Record<string, number> = {};

	// Initialize cumulative totals
	for (const key of dataKeys) {
		cumulativeTotals[key] = 0;
	}

	for (const point of data) {
		const newPoint = { ...point };

		// Add each data key to cumulative total
		for (const key of dataKeys) {
			const value = (point as Record<string, unknown>)[key];
			if (typeof value === "number") {
				cumulativeTotals[key] = (cumulativeTotals[key] ?? 0) + value;
				(newPoint as Record<string, unknown>)[key] = cumulativeTotals[key];
			}
		}

		cumulativeData.push(newPoint);
	}

	return cumulativeData;
};

// Get time format based on granularity
const getTimeFormat = (granularity: string) => {
	switch (granularity) {
		case "minute":
			return "MMM dd HH:mm";
		case "hour":
			return "MMM dd HH:mm";
		case "day":
			return "MMM dd";
		case "week":
			return "MMM dd";
		default:
			return "MMM dd HH:mm";
	}
};

// Custom label formatter for dates
const getLabelFormatter = (granularity: string) => {
	return (value: string) => {
		try {
			const date = new Date(value);
			switch (granularity) {
				case "minute":
					return date.toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					});
				case "hour":
					return date.toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					});
				case "day":
					return date.toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
					});
				case "week":
					return date.toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
					});
				default:
					return value;
			}
		} catch {
			return value;
		}
	};
};

export interface TimeseriesDataPoint {
	timestamp: string;
	[key: string]: string | number;
}

export interface TimeseriesDataset {
	key: string;
	label: string;
	color: string;
	strokeWidth?: number;
	fillOpacity?: number;
}

export interface TimeseriesChartProps {
	// Data props
	data: TimeseriesDataPoint[];
	datasets: TimeseriesDataset[];

	// Configuration props
	height?: number;
	className?: string;
	granularity?: "minute" | "hour" | "day" | "week";
	isCumulative?: boolean;

	// Chart props
	showGrid?: boolean;
	yAxisWidth?: number;
	tooltipIndicator?: "dot" | "line" | "dashed";
}

export const TimeseriesChart = ({
	data,
	datasets,
	height = 250,
	className,
	granularity = "hour",
	isCumulative = false,
	showGrid = true,
	yAxisWidth = 50,
	tooltipIndicator = "dot",
}: TimeseriesChartProps) => {
	// Process data based on cumulative setting
	const processedData = useMemo((): AreaChartDataPoint[] => {
		if (!data || data.length === 0) {
			return [];
		}

		let processedPoints = data;

		// Convert to cumulative if needed
		if (isCumulative) {
			const dataKeys = datasets.map((d) => d.key);
			processedPoints = convertToCumulativeData(data, dataKeys);
		}

		return processedPoints.map((point) => ({
			timestamp: point.timestamp,
			...Object.fromEntries(
				datasets.map((dataset) => [
					dataset.key,
					(point as Record<string, unknown>)[dataset.key] || 0,
				]),
			),
		}));
	}, [data, datasets, isCumulative]);

	// Convert datasets to AreaChartDataset format
	const areaChartDatasets = useMemo((): AreaChartDataset[] => {
		return datasets.map((dataset) => ({
			key: dataset.key,
			label: dataset.label,
			color: dataset.color,
			strokeWidth: dataset.strokeWidth || 2,
			fillOpacity: dataset.fillOpacity || 0.3,
		}));
	}, [datasets]);

	// Get label formatter based on granularity
	const labelFormatter = useMemo(
		() => getLabelFormatter(granularity),
		[granularity],
	);

	return (
		<AreaChartComponent
			data={processedData}
			datasets={areaChartDatasets}
			height={height}
			className={className}
			showLegend={false}
			showGrid={showGrid}
			timeFormat={getTimeFormat(granularity)}
			labelFormatter={labelFormatter}
			tooltipIndicator={tooltipIndicator}
			yAxisWidth={yAxisWidth}
		/>
	);
};
