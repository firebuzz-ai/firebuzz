"use client";

import type { Doc } from "@firebuzz/convex";
import type {
  TimeseriesDataPoint,
  TimeseriesDataset,
} from "@firebuzz/ui/components/charts/timeseries-chart";
import { TimeseriesChart } from "@firebuzz/ui/components/charts/timeseries-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@firebuzz/ui/components/ui/card";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { useMemo } from "react";
// Import date utilities - date-fns should be available from UI package

interface TimeSeriesChartWrapperProps {
  timeseriesData?: Extract<
    Doc<"analyticsPipes">,
    { queryId: "timeseries-primitives" }
  > | null;
  isLoading?: boolean;
  className?: string;
  granularity?: "minute" | "hour" | "day" | "week";
  isCumulative?: boolean;
  title?: string;
  description?: string;
}

export const TimeSeriesChartWrapper = ({
  timeseriesData,
  isLoading,
  className,
  granularity = "hour",
  isCumulative = false,
  title = "Time Series Chart",
  description,
}: TimeSeriesChartWrapperProps) => {
  // Use only real data from Tinybird
  const dataToUse = timeseriesData;

  // Debug logging
  console.log("TimeSeriesChartWrapper - Real data:", {
    hasData: !!dataToUse,
    payloadLength: dataToUse?.payload?.length,
    firstFewPoints: dataToUse?.payload?.slice(0, 3),
    lastFewPoints: dataToUse?.payload?.slice(-3),
    granularity,
  });

  // Transform timeseries data for the TimeseriesChart
  const chartData = useMemo((): TimeseriesDataPoint[] => {
    if (!dataToUse?.payload) {
      return [];
    }

    return dataToUse.payload.map((point) => ({
      timestamp: point.bucket_start, // Use bucket_start as timestamp
      sessions: point.all_sessions,
      conversions: point.conversions,
      // Add additional fields that might be useful
      new_sessions: point.new_sessions,
      returning_sessions: point.returning_sessions,
      users: point.users,
    }));
  }, [dataToUse]);

  // Define datasets for sessions and conversions
  const datasets = useMemo((): TimeseriesDataset[] => {
    return [
      {
        key: "sessions",
        label: "Sessions",
        color: "hsl(var(--brand))", // Brand color for sessions
        strokeWidth: 2,
        fillOpacity: 0.3, // Increased from 0.1 to make area visible
      },
      {
        key: "conversions",
        label: "Conversions",
        color: "#10b981", // Emerald-500 color for conversions
        strokeWidth: 2,
        fillOpacity: 0.3, // Increased from 0.1 to make area visible
      },
    ];
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-medium">{title}</CardTitle>
              {description && (
                <CardDescription className="text-sm text-muted-foreground">
                  {description ||
                    (isCumulative
                      ? "Cumulative data over time"
                      : "Total data over time")}
                </CardDescription>
              )}
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
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-medium">{title}</CardTitle>
              {description && (
                <CardDescription className="text-sm text-muted-foreground">
                  {description ||
                    (isCumulative
                      ? "Cumulative data over time"
                      : "Total data over time")}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {description && (
              <CardDescription className="text-sm text-muted-foreground">
                {description ||
                  (isCumulative
                    ? "Cumulative data over time"
                    : "Total data over time")}
              </CardDescription>
            )}
          </div>

          {/* Header legend */}
          <div className="flex gap-4 items-center">
            {datasets.map((dataset) => (
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
      <CardContent className="pt-4 pr-2 pl-0 sm:pr-6 sm:pt-6">
        <TimeseriesChart
          data={chartData}
          datasets={datasets}
          height={200}
          granularity={granularity}
          isCumulative={isCumulative}
          showGrid={true}
          tooltipIndicator="dot"
          yAxisWidth={50}
        />
      </CardContent>
    </Card>
  );
};
