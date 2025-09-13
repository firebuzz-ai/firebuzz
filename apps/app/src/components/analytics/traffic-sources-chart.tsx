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
import {
	FacebookIcon,
	GoogleIcon,
	LinkedInIcon,
	TwitterIcon,
} from "@firebuzz/ui/icons/social";
import { capitalizeFirstLetter } from "@firebuzz/utils";
import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

interface TrafficSourcesChartProps {
	audienceData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "audience-breakdown" }
	> | null;
	isLoading?: boolean;
	className?: string;
}

interface TrafficSourceData {
	source: string;
	sessions: number;
	percentage: number;
	fill: string;
}

export const TrafficSourcesChart = ({
	audienceData,
	isLoading,
	className,
}: TrafficSourcesChartProps) => {
	// Transform the utm_sources data from audience breakdown
	const chartData = useMemo((): TrafficSourceData[] => {
		if (!audienceData?.payload?.utm_sources) {
			return [];
		}

		// utm_sources is an array of tuples: [source_name, sessions, users, new_sessions, returning_sessions, percentage]
		const sources = audienceData.payload.utm_sources
			.slice(0, 5) // Get top 5 sources
			.map((sourceData) => {
				const sourceName = sourceData[0] as string;
				const sourceKey = sourceName.toLowerCase().replace(/[^a-z0-9]/g, "");
				return {
					source: sourceKey,
					sessions: sourceData[1] as number,
					percentage: sourceData[5] as number,
					fill: `var(--color-${sourceKey})`,
				};
			});

		return sources;
	}, [audienceData]);

	// Chart configuration for tooltip and legend
	const chartConfig = useMemo((): ChartConfig => {
		if (!audienceData?.payload?.utm_sources) {
			return { sessions: { label: "Sessions" } };
		}

		const config: ChartConfig = {
			sessions: {
				label: "Sessions",
			},
		};

		audienceData.payload.utm_sources
			.slice(0, 5)
			.forEach((sourceData, index) => {
				const sourceName = sourceData[0] as string;
				const sourceKey = sourceName.toLowerCase().replace(/[^a-z0-9]/g, "");
				config[sourceKey] = {
					label: sourceName,
					color: `var(--chart-${index + 1})`,
				};
			});

		return config;
	}, [audienceData]);

	// Calculate total sessions for trend calculation
	const totalSessions = useMemo(() => {
		return chartData.reduce((sum, item) => sum + item.sessions, 0);
	}, [chartData]);

	if (isLoading) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle className="text-base font-medium">
						Top 5 Traffic Sources
					</CardTitle>
					<CardDescription>Sessions by traffic source</CardDescription>
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
					<CardTitle className="text-base font-medium">
						Top 5 Traffic Sources
					</CardTitle>
					<CardDescription>Sessions by traffic source</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex h-[200px] items-center justify-center">
						<div className="text-center">
							<p className="text-sm text-muted-foreground">
								No traffic source data available
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	const topSource = chartData[0];
	const topSourcePercentage = topSource?.percentage || 0;

	return (
		<Card className="bg-muted">
			<CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
				<CardTitle className="text-base font-medium">
					Top 5 Traffic Sources
				</CardTitle>
				<CardDescription>Sessions by traffic source</CardDescription>
			</CardHeader>
			<CardContent className="p-0">
				<ChartContainer className="h-[200px] w-full" config={chartConfig}>
					<BarChart
						height={200}
						accessibilityLayer
						data={chartData}
						margin={{
							left: 0,
							right: 0,
							top: 0,
							bottom: 0,
						}}
					>
						<XAxis
							dataKey="source"
							type="category"
							tickLine={false}
							axisLine={false}
							textAnchor="middle"
							tickFormatter={(value) => {
								const label =
									chartConfig[value as keyof typeof chartConfig]?.label ||
									value;
								return capitalizeFirstLetter(label);
							}}
						/>
						<YAxis dataKey="sessions" type="number" hide />
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent hideLabel />}
						/>
						<Bar dataKey="sessions" radius={8} maxBarSize={60} />
					</BarChart>
				</ChartContainer>
			</CardContent>
			{topSource && (
				<div className="flex justify-between items-center px-6 py-4 text-sm border-t">
					<div className="flex-col gap-2 items-start">
						<div className="flex gap-1 font-medium leading-none">
							<span className="font-medium capitalize text-brand">
								{topSource.source}
							</span>{" "}
							is the top source <TrendingUp className="w-4 h-4" />
						</div>
						<div className="leading-none text-muted-foreground">
							{topSourcePercentage.toFixed(1)}% of all sessions (
							{totalSessions.toLocaleString()} total)
						</div>
					</div>
					{audienceData && (
						<div className="flex gap-1 items-center text-xs text-muted-foreground">
							Source:{" "}
							<div className="flex gap-1 items-center">
								<div className="flex justify-center items-center p-1 rounded-md border size-5">
									<SourceIcon source={audienceData.source} />
								</div>
								<span className="capitalize text-muted-foreground">
									{audienceData.source}
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
