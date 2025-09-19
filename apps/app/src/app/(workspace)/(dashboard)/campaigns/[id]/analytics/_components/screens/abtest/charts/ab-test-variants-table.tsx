"use client";

import type { Doc } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@firebuzz/ui/components/ui/table";
import {
	CheckCheck,
	Clock,
	Crown,
	Eye,
	Goal,
	TrendingUp,
	UndoDot,
	X,
} from "@firebuzz/ui/icons/lucide";
import { useMemo } from "react";
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

const getVariantTextColor = (color: string) => {
	return color === "rgb(234 179 8)" ? "text-black" : "text-white";
};

interface AbTestVariantsTableProps {
	abTest: AbTestWithResults;
	campaign?: Doc<"campaigns"> | null;
}

export const AbTestVariantsTable = ({
	abTest,
	campaign,
}: AbTestVariantsTableProps) => {
	const analyticsData = useMemo(() => {
		return abTest.analytics?.payload;
	}, [abTest.analytics]);

	const tableData = useMemo(() => {
		// Merge variants with their analytics data
		const mergedData = abTest.variants.map((variant, index) => {
			const analyticsForVariant = analyticsData?.find(
				(analytics) => analytics.ab_test_variant_id === variant.id,
			);

			const letter = getVariantLetter(index);
			const isControl = index === 0; // First variant is typically control
			const color = getVariantColor(index, isControl);
			const textColor = getVariantTextColor(color);

			const isWinner =
				abTest.status === "completed" && abTest.winner === variant.id;

			return {
				variant,
				letter,
				isControl,
				color,
				textColor,
				analytics: analyticsForVariant,
				originalIndex: index,
				isWinner,
			};
		});

		// Find the best performing variant for each metric
		const bestExposures = Math.max(
			...mergedData.map((d) => d.analytics?.exposures || 0),
		);
		const bestConversions = Math.max(
			...mergedData.map((d) => d.analytics?.conversions || 0),
		);
		const bestConversionRate = Math.max(
			...mergedData.map((d) => d.analytics?.conversion_rate || 0),
		);
		const bestTotalRevenue = Math.max(
			...mergedData.map((d) => d.analytics?.total_revenue || 0),
		);
		const bestAvgOrderValue = Math.max(
			...mergedData.map((d) => d.analytics?.avg_order_value || 0),
		);
		const bestWinProbability = Math.max(
			...mergedData.map((d) => d.analytics?.win_probability || 0),
		);

		// Add isBest flags for each metric
		return mergedData.map((row) => ({
			...row,
			isBestExposures:
				(row.analytics?.exposures || 0) === bestExposures && bestExposures > 0,
			isBestConversions:
				(row.analytics?.conversions || 0) === bestConversions &&
				bestConversions > 0,
			isBestConversionRate:
				(row.analytics?.conversion_rate || 0) === bestConversionRate &&
				bestConversionRate > 0,
			isBestTotalRevenue:
				(row.analytics?.total_revenue || 0) === bestTotalRevenue &&
				bestTotalRevenue > 0,
			isBestAvgOrderValue:
				(row.analytics?.avg_order_value || 0) === bestAvgOrderValue &&
				bestAvgOrderValue > 0,
			isBestWinProbability:
				(row.analytics?.win_probability || 0) === bestWinProbability &&
				bestWinProbability > 0,
		}));
	}, [abTest.variants, analyticsData, abTest.status, abTest.winner]);

	const formatNumber = (num: number | undefined) => {
		if (num === undefined || num === null) return "0";
		return num.toLocaleString();
	};

	const formatPercentage = (num: number | undefined) => {
		if (num === undefined || num === null) return "0.00%";
		return `${num.toFixed(2)}%`;
	};

	const formatDuration = (seconds: number | undefined) => {
		if (seconds === undefined || seconds === null) return "0s";
		if (seconds < 60) return `${seconds.toFixed(0)}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
	};

	// Get currency from campaign settings
	const currency = useMemo(() => {
		// Try to get currency from primary goal first
		const primaryGoalCurrency =
			campaign?.campaignSettings?.primaryGoal?.currency;
		if (primaryGoalCurrency) {
			return primaryGoalCurrency;
		}

		// If no primary goal currency, check if we can find it from custom events
		// based on the A/B test's primary goal
		const customEvents = campaign?.campaignSettings?.customEvents;
		if (customEvents && abTest.primaryGoalId) {
			const matchingEvent = customEvents.find(
				(event) => event.id === abTest.primaryGoalId,
			);
			if (matchingEvent?.currency) {
				return matchingEvent.currency;
			}
		}

		// Default to USD
		return "USD";
	}, [campaign?.campaignSettings, abTest.primaryGoalId]);

	const formatCurrency = (amount: number | undefined) => {
		if (amount === undefined || amount === null)
			return new Intl.NumberFormat("en-US", {
				style: "currency",
				currency,
			}).format(0);

		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
		}).format(amount);
	};

	return (
		<Table className="mb-4">
			<TableHeader>
				<TableRow>
					<TableHead className="w-[200px]">Variant</TableHead>
					<TableHead className="text-center">Exposures</TableHead>
					<TableHead className="text-center">Conversions</TableHead>
					<TableHead className="text-center">Conv. Rate</TableHead>
					<TableHead className="text-center">Tot. Value</TableHead>
					<TableHead className="text-center">Avg. Value</TableHead>
					<TableHead className="text-center">Avg. Session Duration</TableHead>
					<TableHead className="text-center">Bounce Rate</TableHead>
					<TableHead className="text-center">Win Probability</TableHead>
					<TableHead className="text-center">Statistical Sig.</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{tableData.map((row) => {
					const hasWinner = abTest.status === "completed" && abTest.winner;
					const isNonWinner = hasWinner && !row.isWinner;

					return (
						<TableRow
							key={row.variant.id}
							className={isNonWinner ? "opacity-60 text-muted-foreground" : ""}
						>
							<TableCell className="font-medium truncate">
								<div className="flex gap-3 items-center">
									<div
										className={`flex items-center justify-center w-6 h-6 text-xs font-bold rounded ${row.textColor}`}
										style={{ backgroundColor: row.color }}
									>
										{row.letter}
									</div>
									<div className="flex gap-2 items-center">
										<span className="font-medium">{row.variant.name}</span>
										{row.isControl && <Badge variant="outline">Control</Badge>}
										{row.isWinner && (
											<Badge variant="outline" className="gap-1 text-brand">
												<Crown className="size-3" />
												Winner
											</Badge>
										)}
									</div>
								</div>
							</TableCell>
							<TableCell className="text-center">
								<Badge variant="outline" className="gap-1">
									<Eye className="size-3" />
									{formatNumber(row.analytics?.exposures)}
								</Badge>
							</TableCell>
							<TableCell className="text-center">
								<Badge
									variant="outline"
									className={`gap-1 ${row.isBestConversions ? "border-emerald-500 text-emerald-600" : ""}`}
								>
									{row.isBestConversions ? (
										<TrendingUp className="text-emerald-600 size-3" />
									) : (
										<Goal className="size-3" />
									)}
									{formatNumber(row.analytics?.conversions)}
								</Badge>
							</TableCell>
							<TableCell className="text-center">
								<Badge
									variant="outline"
									className={`gap-1 ${row.isBestConversionRate ? "border-emerald-500 text-emerald-600" : ""}`}
								>
									{row.isBestConversionRate && (
										<TrendingUp className="text-emerald-600 size-3" />
									)}
									{formatPercentage(row.analytics?.conversion_rate)}
								</Badge>
							</TableCell>
							<TableCell className="text-center">
								<Badge
									variant="outline"
									className={`gap-1 ${row.isBestTotalRevenue ? "border-emerald-500 text-emerald-600" : ""}`}
								>
									{row.isBestTotalRevenue && (
										<TrendingUp className="text-emerald-600 size-3" />
									)}
									{formatCurrency(row.analytics?.total_revenue)}
								</Badge>
							</TableCell>

							<TableCell className="text-center">
								<Badge
									variant="outline"
									className={`gap-1 ${row.isBestAvgOrderValue ? "border-emerald-500 text-emerald-600" : ""}`}
								>
									{row.isBestAvgOrderValue && (
										<TrendingUp className="text-emerald-600 size-3" />
									)}
									{formatCurrency(row.analytics?.avg_order_value ?? 0)}
								</Badge>
							</TableCell>
							<TableCell className="text-center">
								<Badge variant="outline" className="gap-1">
									<Clock className="size-3" />
									{formatDuration(row.analytics?.avg_session_duration)}
								</Badge>
							</TableCell>
							<TableCell className="text-center">
								<Badge variant="outline" className="gap-1">
									<UndoDot className="size-3" />
									{formatPercentage(row.analytics?.bounce_rate)}
								</Badge>
							</TableCell>
							<TableCell className="text-center">
								<Badge
									variant="outline"
									className={`gap-1 ${row.isBestWinProbability ? "border-emerald-500 text-emerald-600" : ""}`}
								>
									{row.isBestWinProbability && (
										<TrendingUp className="text-emerald-600 size-3" />
									)}
									{formatPercentage(row.analytics?.win_probability)}
								</Badge>
							</TableCell>
							<TableCell className="text-center">
								{row.analytics?.is_statistically_significant ? (
									<Badge variant="outline" className="gap-1">
										<CheckCheck className="text-emerald-600 size-3" />
										Significant
									</Badge>
								) : (
									<Badge variant="outline" className="gap-1">
										<X className="size-3" />
										Not Significant
									</Badge>
								)}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
};
