"use client";

import type { Doc } from "@firebuzz/convex";
import { Icon } from "@firebuzz/ui/components/brand/icon";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { ChartArea, TrendingUp } from "@firebuzz/ui/icons/lucide";
import {
  FacebookIcon,
  GoogleIcon,
  LinkedInIcon,
  TwitterIcon,
} from "@firebuzz/ui/icons/social";
import { capitalizeFirstLetter } from "@firebuzz/utils";
import { format, parseISO } from "date-fns";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

// Internal types for the consolidated component
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

// Helper function to convert data to cumulative timeseries
const convertToCumulativeData = (
  data: TimeseriesDataPoint[],
  dataKeys: string[]
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

// Inline Timeseries Chart Component
interface InlineTimeseriesChartProps {
  data: TimeseriesDataPoint[];
  datasets: TimeseriesDataset[];
  height?: number;
  granularity?: "minute" | "hour" | "day" | "week";
  isCumulative?: boolean;
  showGrid?: boolean;
  yAxisWidth?: number;
  tooltipIndicator?: "dot" | "line" | "dashed";
}

const InlineTimeseriesChart = ({
  data,
  datasets,
  height: _height = 250, // Renamed to indicate it's intentionally unused
  granularity = "hour",
  isCumulative = false,
  showGrid = true,
  yAxisWidth = 50,
  tooltipIndicator = "dot",
}: InlineTimeseriesChartProps) => {
  // Process data based on cumulative setting
  const processedData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    let processedPoints = data;

    // Convert to cumulative if needed
    if (isCumulative) {
      const dataKeys = datasets.map((d) => d.key);
      processedPoints = convertToCumulativeData(data, dataKeys);
    }

    return processedPoints.map((point) => {
      let formattedTimestamp = point.timestamp;

      // Try to parse and format timestamp if it looks like ISO date
      try {
        if (point.timestamp.includes("T") || point.timestamp.includes("-")) {
          const date = parseISO(point.timestamp);
          formattedTimestamp = format(date, getTimeFormat(granularity));
        }
      } catch {
        // If parsing fails, use original timestamp
      }

      return {
        timestamp: point.timestamp,
        formattedTimestamp,
        ...Object.fromEntries(
          datasets.map((dataset) => [
            dataset.key,
            (point as Record<string, unknown>)[dataset.key] || 0,
          ])
        ),
      };
    });
  }, [data, datasets, isCumulative, granularity]);

  // Build chart config from datasets
  const chartConfig = useMemo((): ChartConfig => {
    const config: ChartConfig = {};

    for (const dataset of datasets) {
      config[dataset.key] = {
        label: dataset.label,
        color: dataset.color,
      };
    }

    return config;
  }, [datasets]);

  // Get label formatter based on granularity
  const labelFormatter = useMemo(
    () => getLabelFormatter(granularity),
    [granularity]
  );

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full p-4">
      <AreaChart
        data={processedData}
        margin={{
          left: -24,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        )}

        <XAxis
          dataKey="formattedTimestamp"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          padding={{ left: 0, right: 8 }}
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />

        <YAxis
          width={yAxisWidth}
          tickMargin={0}
          tick={{ fontSize: 12 }}
          padding={{ top: 0, bottom: 0 }}
          tickLine={false}
          axisLine={false}
          className="fill-muted-foreground"
        />

        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={labelFormatter}
              indicator={tooltipIndicator}
            />
          }
        />

        {datasets.map((dataset) => (
          <Area
            key={dataset.key}
            type="monotone"
            dataKey={dataset.key}
            stroke={dataset.color}
            strokeWidth={dataset.strokeWidth || 2}
            fill={dataset.color}
            fillOpacity={dataset.fillOpacity || 0.3}
            connectNulls={false}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
};

interface TimeSeriesChartWrapperProps {
  timeseriesData?: Extract<
    Doc<"analyticsPipes">,
    { queryId: "timeseries-primitives" }
  > | null;
  isLoading?: boolean;
  className?: string;
  granularity?: "minute" | "hour" | "day" | "week";
  isCumulative?: boolean;
  title: string;
  description: string;
  datasets?: TimeseriesDataset[];
  dataKeys?: string[];
  source?: Doc<"analyticsPipes">["source"];
  showTrend?: boolean;
  isRealtime?: boolean;
}

export const TimeSeriesChartWrapper = ({
  timeseriesData,
  isLoading,
  className,
  granularity = "hour",
  isCumulative = false,
  title,
  description,
  datasets,
  dataKeys = ["all_sessions", "conversions"],
  source,
  showTrend = true,
  isRealtime = false,
}: TimeSeriesChartWrapperProps) => {
  const dataToUse = timeseriesData;

  // Transform timeseries data for the TimeseriesChart
  const chartData = useMemo((): TimeseriesDataPoint[] => {
    if (!dataToUse?.payload) {
      return [];
    }

    return dataToUse.payload.map((point) => {
      // Create flexible data point with timestamp and all available fields
      const dataPoint: TimeseriesDataPoint = {
        timestamp: point.bucket_start,
      };

      // Map all available fields from the point (only primitive values)
      for (const key of Object.keys(point)) {
        if (key !== "bucket_start") {
          const value = point[key as keyof typeof point];
          // Only include primitive values (string or number), skip arrays
          if (typeof value === "string" || typeof value === "number") {
            dataPoint[key] = value;
          }
        }
      }

      return dataPoint;
    });
  }, [dataToUse]);

  // Define datasets - use provided datasets or create default ones
  const chartDatasets = useMemo((): TimeseriesDataset[] => {
    if (datasets) {
      return datasets;
    }

    // Create default datasets based on dataKeys
    return dataKeys.map((key, index) => ({
      key,
      label: capitalizeFirstLetter(key.replace(/_/g, " ")),
      color:
        index === 0
          ? "hsl(var(--brand))"
          : index === 1
            ? "#10b981"
            : `hsl(var(--chart-${(index % 5) + 1}))`,
      strokeWidth: 2,
      fillOpacity: 0.3,
    }));
  }, [datasets, dataKeys]);

  // Calculate summary data for footer
  const summaryData = useMemo(() => {
    if (!chartData.length || !chartDatasets.length) return null;

    // Calculate totals for all datasets
    const datasetSummaries = chartDatasets.map((dataset) => {
      const total = chartData.reduce(
        (sum, point) => sum + Number(point[dataset.key] || 0),
        0
      );
      const latest = Number(
        chartData[chartData.length - 1]?.[dataset.key] || 0
      );
      const peak = Math.max(
        ...chartData.map((point) => Number(point[dataset.key] || 0))
      );

      return {
        key: dataset.key,
        label: dataset.label,
        total,
        latest,
        peak,
        color: dataset.color,
      };
    });

    // Get primary dataset (first one) for main display
    const primaryDataset = datasetSummaries[0];

    return {
      primary: primaryDataset,
      all: datasetSummaries,
      timeRange: {
        start: chartData[0]?.timestamp,
        end: chartData[chartData.length - 1]?.timestamp,
        dataPoints: chartData.length,
      },
    };
  }, [chartData, chartDatasets]);

  // Show loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex gap-2 items-center text-base font-medium">
                {isRealtime && (
                  <div className="flex justify-center items-center bg-green-500 rounded-full animate-pulse size-2" />
                )}
                {title}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Show empty state
  if (!chartData || chartData.length === 0) {
    return (
      <Card className="flex flex-col bg-muted">
        <CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
          <CardTitle className="flex gap-2 items-center text-base font-medium">
            {isRealtime && (
              <div className="flex justify-center items-center bg-green-500 rounded-full animate-pulse size-2" />
            )}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex h-[250px] items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                No data available for the selected period
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-muted">
      <CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex gap-2 items-center text-base font-medium">
              {isRealtime && (
                <div className="flex justify-center items-center bg-green-500 rounded-full animate-pulse size-2" />
              )}
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>

          {/* Header legend */}
          <div className="flex gap-4 items-center">
            {chartDatasets.map((dataset) => (
              <div key={dataset.key} className="flex gap-2 items-center">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: dataset.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {dataset.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 py-0">
        <InlineTimeseriesChart
          data={chartData}
          datasets={chartDatasets}
          height={200}
          granularity={granularity}
          isCumulative={isCumulative}
          showGrid={true}
          tooltipIndicator="dot"
          yAxisWidth={50}
        />
      </CardContent>
      <CardFooter className="flex justify-between items-center py-4 text-sm border-t">
        {showTrend && summaryData && (
          <>
            <div className="flex-col gap-2 items-start">
              <div className="flex gap-1 font-medium leading-none">
                <span className="font-medium text-emerald-500">
                  {summaryData.primary.label}
                </span>{" "}
                {isCumulative ? "cumulative total" : "time series summary"}{" "}
                {!isCumulative ? (
                  <TrendingUp className="size-4" />
                ) : (
                  <ChartArea className="size-4" />
                )}
              </div>
              <div className="leading-none text-muted-foreground">
                {isCumulative ? (
                  <>
                    {summaryData.primary.total.toLocaleString()} total{" "}
                    {summaryData.primary.label.toLowerCase()} over{" "}
                    {summaryData.timeRange.dataPoints} data points
                  </>
                ) : (
                  <>
                    {summaryData.primary.total.toLocaleString()} total • Peak:{" "}
                    {summaryData.primary.peak.toLocaleString()} • Latest:{" "}
                    {summaryData.primary.latest.toLocaleString()}
                  </>
                )}
              </div>
            </div>
            {source && (
              <div className="flex gap-1 items-center text-xs text-muted-foreground">
                Source:{" "}
                <div className="flex gap-1 items-center">
                  <div className="flex justify-center items-center p-1 rounded-md border size-5">
                    <SourceIcon source={source} />
                  </div>
                  <span className="capitalize text-muted-foreground">
                    {source}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
};

const SourceIcon = ({
  source,
}: {
  source: Doc<"analyticsPipes">["source"];
}) => {
  switch (source) {
    case "facebook":
      return <FacebookIcon />;
    case "google":
      return <GoogleIcon />;
    case "twitter":
      return <TwitterIcon />;
    case "linkedin":
      return <LinkedInIcon />;
    case "firebuzz":
      return <Icon className="size-4" />;
    default:
      return <Icon />;
  }
};
