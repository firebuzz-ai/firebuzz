"use client";

import { useSubscription } from "@/hooks/auth/use-subscription";
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
} from "@firebuzz/ui/components/ui/chart";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import {
	Cell,
	Label,
	PolarGrid,
	PolarRadiusAxis,
	RadialBar,
	RadialBarChart,
} from "recharts";

const chartConfig = {
	used: {
		label: "Used Credits",
		color: "var(--chart-1)",
	},
	total: {
		label: "Total Credits",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

export const UsageSummaryChart = () => {
	const { currentPeriodUsage, currentPeriodAdditions, isLoading } =
		useSubscription();

	if (isLoading) {
		return (
			<Card className="py-0 bg-muted">
				<CardHeader className="flex flex-col items-stretch border-b !p-0 space-y-0 sm:flex-row">
					<div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
						<CardTitle>Usage Summary</CardTitle>
						<CardDescription>Current billing period</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="px-2 sm:p-6">
					<Skeleton className="mx-auto aspect-square max-h-[250px] w-full" />
				</CardContent>
			</Card>
		);
	}

	const totalAvailable = currentPeriodAdditions;
	const usagePercentage =
		totalAvailable > 0
			? Math.round((currentPeriodUsage / totalAvailable) * 100)
			: 0;

	const chartData = [
		{
			usage: usagePercentage,
		},
		{
			usage: 100,
		},
	];

	return (
		<Card className="overflow-hidden py-0 bg-muted">
			<CardHeader className="flex flex-col items-stretch border-b !p-0 space-y-0 sm:flex-row">
				<div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
					<CardTitle>Usage Summary</CardTitle>
					<CardDescription>
						Current billing period usage breakdown
					</CardDescription>
				</div>
				<div>
					<div className="flex relative z-30 flex-col flex-1 justify-center px-6 py-4 text-left border-t sm:border-t-0 sm:border-l sm:px-8 sm:py-6 bg-muted">
						<span className="text-xs text-muted-foreground">
							Usage Percentage
						</span>
						<span className="text-lg font-bold leading-none sm:text-3xl">
							{usagePercentage}%
						</span>
					</div>
				</div>
			</CardHeader>
			<CardContent className="px-2 sm:p-6">
				<ChartContainer
					config={chartConfig}
					className="mx-auto aspect-square max-h-[250px]"
				>
					<RadialBarChart
						data={chartData}
						startAngle={-90}
						endAngle={270}
						innerRadius={80}
						outerRadius={110}
					>
						<PolarGrid
							gridType="circle"
							radialLines={false}
							stroke="none"
							className="first:fill-muted last:fill-background"
							polarRadius={[86, 74]}
						/>
						<RadialBar
							dataKey="usage"
							background={{ fill: "var(--color-total)" }}
							cornerRadius={10}
						>
							{chartData.map((_, index) => (
								<Cell
									// biome-ignore lint/suspicious/noArrayIndexKey: Using index is appropriate here for chart cells
									key={`cell-${index}`}
									fill={index === 0 ? "var(--color-used)" : "transparent"}
								/>
							))}
						</RadialBar>
						<PolarRadiusAxis
							tick={false}
							tickLine={false}
							axisLine={false}
							domain={[0, 100]}
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
													className="text-4xl font-bold fill-foreground"
												>
													{currentPeriodUsage.toLocaleString()}/
													{totalAvailable.toLocaleString()}
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 24}
													className="fill-muted-foreground"
												>
													Balance
												</tspan>
											</text>
										);
									}
								}}
							/>
						</PolarRadiusAxis>
					</RadialBarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
};
