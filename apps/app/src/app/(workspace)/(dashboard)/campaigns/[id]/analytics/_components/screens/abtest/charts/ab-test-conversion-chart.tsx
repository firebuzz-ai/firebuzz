"use client";

import { Icon } from "@firebuzz/ui/components/brand/icon";
import { Card, CardContent, CardFooter } from "@firebuzz/ui/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@firebuzz/ui/components/ui/chart";
import { Crown, TrendingUp } from "@firebuzz/ui/icons/lucide";
import { useMemo } from "react";
import { CartesianGrid, Line, LineChart } from "recharts";
import type { AbTestWithResults } from "../index";

// Helper functions for letter-based variant system
const getVariantLetter = (index: number) => {
	return String.fromCharCode(65 + index); // A, B, C, etc.
};

const getVariantColor = (index: number, isControl: boolean) => {
	if (isControl) {
		return "rgb(59 130 246)"; // Blue for control (A)
	}

	const colors = [
		"rgb(59 130 246)", // A (control) - blue
		"rgb(5 150 105)", // B - emerald
		"rgb(168 85 247)", // C - purple
		"rgb(249 115 22)", // D - orange
		"rgb(236 72 153)", // E - pink
		"rgb(99 102 241)", // F - indigo
		"rgb(239 68 68)", // G - red
		"rgb(20 184 166)", // H - teal
		"rgb(234 179 8)", // I - yellow (with black text)
		"rgb(6 182 212)", // J - cyan
	];

	return colors[index] || "rgb(107 114 128)"; // Fallback gray
};

interface AbTestConversionChartProps {
	abTest: AbTestWithResults;
	campaignConversionRate: number;
}

export const AbTestConversionChart = ({
	abTest,
	campaignConversionRate,
}: AbTestConversionChartProps) => {
	const analyticsData = useMemo(() => {
		return abTest.analytics?.payload;
	}, [abTest.analytics]);

	const chartData = useMemo(() => {
		// Merge variants with their analytics data
		const mergedVariants = abTest.variants.map((variant, index) => {
			const analyticsForVariant = analyticsData?.find(
				(analytics) => analytics.ab_test_variant_id === variant.id,
			);

			const conversionRate =
				analyticsForVariant?.conversions && analyticsForVariant?.exposures > 0
					? (analyticsForVariant.conversions / analyticsForVariant.exposures) *
						100
					: 0;

			const letter = getVariantLetter(index);
			const isControl = index === 0; // First variant is typically control
			const color = getVariantColor(index, isControl);
			const isWinner =
				abTest.status === "completed" && abTest.winner === variant.id;

			return {
				name: variant.name,
				letter,
				variantName: variant.name,
				conversionRate,
				exposures: analyticsForVariant?.exposures || 0,
				conversions: analyticsForVariant?.conversions || 0,
				type: "variant",
				isControl,
				color,
				originalIndex: index,
				isWinner,
			};
		});

		const chartItems = [
			{
				name: "Campaign Overall",
				conversionRate: campaignConversionRate,
				type: "campaign",
				color: "hsl(var(--brand))",
				originalIndex: -1,
				isWinner: false,
			},
			...mergedVariants,
		];

		// Sort by conversion rate (descending)
		return chartItems.sort((a, b) => b.conversionRate - a.conversionRate);
	}, [
		abTest.variants,
		analyticsData,
		campaignConversionRate,
		abTest.status,
		abTest.winner,
	]);

	const chartConfig = {
		conversionRate: {
			label: "Conversion Rate",
			color: "var(--chart-1)",
		},
		campaign: {
			label: "Campaign",
			color: "var(--chart-2)",
		},
		variant: {
			label: "Variant",
			color: "var(--chart-3)",
		},
	} satisfies ChartConfig;

	const summaryData = useMemo(() => {
		if (!chartData.length) return null;

		const variantData = chartData.filter((item) => item.type === "variant");
		if (variantData.length === 0) return null;

		const bestVariant = variantData.reduce((best, current) =>
			current.conversionRate > best.conversionRate ? current : best,
		);

		const averageVariantConversion =
			variantData.reduce((sum, variant) => sum + variant.conversionRate, 0) /
			variantData.length;

		const improvementVsCampaign = bestVariant
			? ((bestVariant.conversionRate - campaignConversionRate) /
					campaignConversionRate) *
				100
			: 0;

		return {
			bestVariant,
			averageVariantConversion,
			improvementVsCampaign,
			totalVariants: variantData.length,
		};
	}, [chartData, campaignConversionRate]);

	return (
		<Card className="bg-muted !rounded-none !border-none !shadow-none">
			<CardContent className="p-0 h-[200px]">
				{chartData.length > 0 ? (
					<ChartContainer config={chartConfig} className="h-[200px] w-full">
						<LineChart
							height={250}
							accessibilityLayer
							data={chartData}
							margin={{
								top: 24,
								left: 24,
								right: 24,
								bottom: 24,
							}}
						>
							<CartesianGrid vertical={false} />
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										indicator="line"
										nameKey="conversionRate"
										hideLabel
										formatter={(value, _name, props) => (
											<div className="flex gap-2 items-center">
												{props.payload?.type === "variant" ? (
													props.payload?.isWinner ? (
														<div className="flex justify-center items-center w-5 h-5 text-xs font-bold rounded border bg-muted">
															<Crown
																className="size-3"
																style={{ color: "hsl(var(--brand))" }}
															/>
														</div>
													) : (
														<div
															className={`flex items-center justify-center w-5 h-5 text-xs font-bold rounded ${
																props.payload?.color === "rgb(234 179 8)"
																	? "text-black"
																	: "text-white"
															}`}
															style={{
																backgroundColor:
																	props.payload?.color || "var(--chart-1)",
															}}
														>
															{props.payload?.letter}
														</div>
													)
												) : (
													<div
														className="w-2 h-2 rounded-full"
														style={{
															backgroundColor:
																props.payload?.color || "var(--chart-1)",
														}}
													/>
												)}
												<span className="font-medium">
													{props.payload?.name}:
												</span>
												<span>{Number(value).toFixed(2)}%</span>
												{props.payload?.exposures && (
													<span className="text-xs text-muted-foreground">
														({props.payload.conversions}/
														{props.payload.exposures})
													</span>
												)}
											</div>
										)}
									/>
								}
							/>
							<Line
								dataKey="conversionRate"
								type="natural"
								stroke="hsl(var(--primary))"
								strokeWidth={2}
								dot={(props) => {
									const color = props.payload?.color || "var(--chart-1)";
									return (
										<circle
											key={props.payload?.name}
											r={5}
											cx={props.cx}
											cy={props.cy}
											fill={color}
											stroke={color}
										/>
									);
								}}
							/>
						</LineChart>
					</ChartContainer>
				) : (
					<div className="flex h-[200px] items-center justify-center">
						<p className="text-sm text-muted-foreground">No data available</p>
					</div>
				)}
			</CardContent>
			{summaryData && (
				<CardFooter className="flex justify-between items-center py-4 text-sm border-t">
					<div className="flex-col gap-2 items-start">
						<div className="flex gap-1 items-center font-medium leading-none">
							{abTest.status === "completed" && abTest.winner ? (
								<>
									<span
										className="font-medium"
										style={{ color: "hsl(var(--brand))" }}
									>
										{chartData.find(
											(item) => item.type === "variant" && item.isWinner,
										)?.name || "Winner"}
									</span>{" "}
									declared as test winner
								</>
							) : summaryData.improvementVsCampaign > 0 ? (
								<>
									<span
										className="font-medium"
										style={{ color: summaryData.bestVariant.color }}
									>
										{summaryData.bestVariant.name}
									</span>{" "}
									performing {summaryData.improvementVsCampaign.toFixed(1)}%
									better <TrendingUp className="size-4" />
								</>
							) : (
								<>
									<span
										className="font-medium"
										style={{ color: "hsl(var(--brand))" }}
									>
										Campaign
									</span>{" "}
									outperforming all variants <TrendingUp className="size-4" />
								</>
							)}
						</div>
						<div className="leading-none text-muted-foreground">
							{summaryData.bestVariant.name} at{" "}
							{summaryData.bestVariant.conversionRate.toFixed(2)}% vs Campaign
							at {campaignConversionRate.toFixed(2)}% across{" "}
							{summaryData.totalVariants} variants
						</div>
					</div>
					<div className="flex gap-1 items-center text-xs text-muted-foreground">
						Source:{" "}
						<div className="flex gap-1 items-center">
							<div className="flex justify-center items-center p-1 rounded-md border size-5">
								<Icon className="size-4" />
							</div>
							<span className="capitalize text-muted-foreground">firebuzz</span>
						</div>
					</div>
				</CardFooter>
			)}
		</Card>
	);
};
