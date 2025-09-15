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
import { Activity, TrendingUp } from "@firebuzz/ui/icons/lucide";
import {
  FacebookIcon,
  GoogleIcon,
  LinkedInIcon,
  TwitterIcon,
} from "@firebuzz/ui/icons/social";
import { capitalizeFirstLetter } from "@firebuzz/utils";
import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

export interface HorizontalBarChartData {
  name: string;
  value: number;
  percentage?: number;
  fill?: string;
}

interface HorizontalBarChartProps {
  data: HorizontalBarChartData[];
  title: string;
  description: string;
  valueLabel?: string;
  isLoading?: boolean;
  className?: string;
  source?: Doc<"analyticsPipes">["source"];
  showTrend?: boolean;
  isRealtime?: boolean;
  maxItems?: number;
}

export const HorizontalBarChart = ({
  data,
  title,
  description,
  valueLabel = "Value",
  isLoading,
  className,
  source,
  showTrend = true,
  isRealtime = false,
  maxItems = 5,
}: HorizontalBarChartProps) => {
  // Transform and limit data
  const chartData = useMemo((): HorizontalBarChartData[] => {
    if (!data || data.length === 0) return [];

    return data.slice(0, maxItems);
  }, [data, maxItems]);

  // Chart configuration for tooltip and legend
  const chartConfig = useMemo((): ChartConfig => {
    const config: ChartConfig = {
      value: {
        label: valueLabel,
        color: "hsl(var(--chart-1))",
      },
    };

    chartData.forEach((item, index) => {
      const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      config[key] = {
        label: item.name,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      };
    });

    return config;
  }, [chartData, valueLabel]);

  // Calculate total value for trend calculation
  const totalValue = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex gap-2 items-center text-base font-medium">
            {isRealtime && (
              <Activity className="w-4 h-4 text-green-500 animate-pulse" />
            )}
            {title}
          </CardTitle>
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
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex gap-2 items-center text-base font-medium">
            {isRealtime && (
              <Activity className="w-4 h-4 text-green-500 animate-pulse" />
            )}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
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
  const topItemPercentage = topItem?.percentage || 0;

  return (
    <Card className="bg-muted">
      <CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
        <CardTitle className="flex gap-2 items-center text-base font-medium">
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ChartContainer className="h-[200px] w-full" config={chartConfig}>
          <BarChart
            layout="vertical"
            height={200}
            accessibilityLayer
            data={chartData}
            margin={{
              left: -8,
              right: 8,
              top: 8,
              bottom: 8,
            }}
          >
            <XAxis type="number" dataKey="value" hide />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={8}
              axisLine={false}
              tickFormatter={(value) => {
                // Truncate long names
                return value.slice(0, 3);
              }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar
              dataKey="value"
              fill="var(--color-value)"
              radius={8}
              maxBarSize={30}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      {showTrend && topItem && (
        <div className="flex justify-between items-center px-6 py-4 text-sm border-t">
          <div className="flex-col gap-2 items-start">
            <div className="flex gap-1 font-medium leading-none">
              <span className="font-medium text-brand">
                {capitalizeFirstLetter(topItem.name)}
              </span>{" "}
              {isRealtime ? "is most active" : "is the top"}{" "}
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="leading-none text-muted-foreground">
              {topItemPercentage > 0 ? (
                <>
                  {topItemPercentage.toFixed(1)}% of all{" "}
                  {valueLabel.toLowerCase()} ({totalValue.toLocaleString()}{" "}
                  total)
                </>
              ) : (
                <>
                  {topItem.value.toLocaleString()} {valueLabel.toLowerCase()}
                  {totalValue > topItem.value && (
                    <> of {totalValue.toLocaleString()} total</>
                  )}
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
        </div>
      )}
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
