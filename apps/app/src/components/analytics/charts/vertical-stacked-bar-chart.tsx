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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export interface VerticalStackedBarChartData {
  name: string;
  newSessions: number;
  returningSessions: number;
}

interface VerticalStackedBarChartProps {
  data: VerticalStackedBarChartData[];
  title: string;
  description: string;
  isLoading?: boolean;
  className?: string;
  source?: Doc<"analyticsPipes">["source"];
  showTrend?: boolean;
  maxItems?: number;
}

export const VerticalStackedBarChart = ({
  data,
  title,
  description,
  isLoading,
  className,
  source,
  showTrend = true,
  maxItems = 7,
}: VerticalStackedBarChartProps) => {
  // Transform and limit data
  const chartData = useMemo((): VerticalStackedBarChartData[] => {
    if (!data || data.length === 0) return [];

    return data.slice(0, maxItems);
  }, [data, maxItems]);

  // Chart configuration for tooltip and legend
  const chartConfig = useMemo((): ChartConfig => {
    const config: ChartConfig = {
      newSessions: {
        label: "New",
        color: "hsl(142 71% 45%)", // emerald-500
      },
      returningSessions: {
        label: "Returning",
        color: "hsl(var(--brand))",
      },
    };

    // Add individual item colors for better tooltip experience
    for (const [index, item] of chartData.entries()) {
      const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      config[key] = {
        label: item.name,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      };
    }

    return config;
  }, [chartData]);

  // Calculate top day for trend calculation
  const topDay = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { name: "", newSessions: 0, returningSessions: 0 };
    }

    // Find the day with most total sessions
    return chartData.reduce(
      (max, day) => {
        const dayTotal = day.newSessions + day.returningSessions;
        const maxTotal = max.newSessions + max.returningSessions;
        return dayTotal > maxTotal ? day : max;
      },
      { name: "", newSessions: 0, returningSessions: 0 }
    );
  }, [chartData]);

  // Use conservative radius to avoid visual artifacts
  const barRadius = useMemo(() => {
    if (!chartData.length) return 0;

    // Check the maximum values to determine appropriate radius
    const maxNew = Math.max(...chartData.map((d) => d.newSessions));
    const maxReturning = Math.max(...chartData.map((d) => d.returningSessions));
    const maxValue = Math.max(maxNew, maxReturning);

    // Use smaller radius for datasets with generally small values
    if (maxValue <= 5) return 1;
    if (maxValue <= 10) return 2;
    return 4; // Full radius for larger datasets
  }, [chartData]);

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

  const topDayTotal = topDay.newSessions + topDay.returningSessions;

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
              left: 8,
              right: 8,
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
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar
              dataKey="newSessions"
              stackId="sessions"
              fill="var(--color-newSessions)"
              radius={[0, 0, barRadius, barRadius]}
              maxBarSize={30}
            />
            <Bar
              dataKey="returningSessions"
              stackId="sessions"
              fill="var(--color-returningSessions)"
              radius={[barRadius, barRadius, 0, 0]}
              maxBarSize={30}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      {showTrend && topDay && (
        <div className="flex justify-between items-center px-6 py-4 text-sm border-t">
          <div className="flex-col gap-2 items-start">
            <div className="flex gap-1 font-medium leading-none">
              <span className="font-medium text-emerald-500">
                {capitalizeFirstLetter(topDay.name)}
              </span>{" "}
              had most sessions <TrendingUp className="w-4 h-4" />
            </div>
            <div className="leading-none text-muted-foreground">
              {topDayTotal.toLocaleString()} sessions (
              {topDay.newSessions.toLocaleString()} new,{" "}
              {topDay.returningSessions.toLocaleString()} returning)
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
