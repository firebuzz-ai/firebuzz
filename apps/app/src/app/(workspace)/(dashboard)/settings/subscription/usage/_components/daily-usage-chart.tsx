"use client";

import { useSubscription } from "@/hooks/auth/use-subscription";
import { useWorkspace } from "@/hooks/auth/use-workspace";
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
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

const chartConfig = {
	credits: {
		label: "Credits",
	},
	daily_usage: {
		label: "Daily Usage",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

export const DailyUsageChart = () => {
	const { currentWorkspace } = useWorkspace();
	const { currentPeriodStart, currentPeriodEnd } = useSubscription();

	const { data: dailyUsage, isLoading } = useQuery({
		queryKey: [
			"daily-usage",
			currentWorkspace?._id,
			currentPeriodStart,
			currentPeriodEnd,
		],
		queryFn: async () => {
			if (!currentWorkspace?._id || !currentPeriodStart || !currentPeriodEnd) {
				return [];
			}

			const response = await fetch(
				`/api/usage/daily?workspaceId=${currentWorkspace._id}&periodStart=${currentPeriodStart}&periodEnd=${currentPeriodEnd}`,
			);

			if (!response.ok) {
				throw new Error("Failed to fetch daily usage data");
			}

			return response.json();
		},
		enabled:
			!!currentWorkspace?._id && !!currentPeriodStart && !!currentPeriodEnd,
		refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
	});

	const chartData =
		dailyUsage?.map((item: { date: string; daily_usage: number }) => ({
			date: new Date(item.date).toISOString().split("T")[0],
			daily_usage: item.daily_usage,
		})) || [];

	const total = React.useMemo(
		() => ({
			daily_usage: chartData.reduce(
				(acc: number, curr: { date: string; daily_usage: number }) =>
					acc + curr.daily_usage,
				0,
			),
		}),
		[chartData],
	);

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Daily Usage</CardTitle>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[300px] w-full" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="overflow-hidden py-0 bg-muted">
			<CardHeader className="flex flex-col items-stretch border-b !p-0 space-y-0 sm:flex-row">
				<div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
					<CardTitle>Daily Usage</CardTitle>
					<CardDescription>
						Showing daily usage for the current period
					</CardDescription>
				</div>
				<div>
					<div className="flex relative z-30 flex-col flex-1 justify-center px-6 py-4 text-left border-t sm:border-t-0 sm:border-l sm:px-8 sm:py-6 bg-muted">
						<span className="text-xs text-muted-foreground">
							Avg. Daily Usage
						</span>
						<span className="text-lg font-bold leading-none sm:text-3xl">
							{(total.daily_usage / chartData.length).toFixed(2)}
						</span>
					</div>
				</div>
			</CardHeader>
			<CardContent className="px-2 sm:p-6">
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[250px] w-full"
				>
					<BarChart
						accessibilityLayer
						data={chartData}
						margin={{
							left: 12,
							right: 12,
						}}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="date"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={32}
							tickFormatter={(value) => {
								const date = new Date(value);
								return date.toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
								});
							}}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									className="w-[150px]"
									nameKey="credits"
									labelFormatter={(value) => {
										return new Date(value).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
										});
									}}
								/>
							}
						/>
						<Bar
							dataKey="daily_usage"
							fill="var(--color-daily_usage)"
							radius={[5, 5, 0, 0]}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
};
