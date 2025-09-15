import type { LucideIcon } from "@firebuzz/ui/icons/lucide";
import { Banknote, Eye, Target, TrendingUp } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { getCurrencySymbol } from "@firebuzz/utils";

import type { Doc } from "@firebuzz/convex";
import { KPICard } from "./kpi-card";

// Define KPI configuration with calculation and display logic
interface KPIConfig {
	id: string;
	title: string;
	icon: LucideIcon;
	getCurrentValue: (payload: SumPrimitivesPayload) => number;
	getPreviousValue: (payload: SumPrimitivesPayload) => number;
	primaryGoalDirection: "up" | "down"; // up = higher is better, down = lower is better
	suffix?: string;
	prefix?: string;
	formatOptions?: {
		notation?: "standard" | "compact";
		maximumFractionDigits?: number;
	};
	isPercentage?: boolean; // For conversion rate calculation
	hideInRealtime?: boolean; // Hide this KPI in realtime mode
	showOnlyInRealtime?: boolean; // Show this KPI only in realtime mode
}

// Utility type to extract payload type based on queryId
type ExtractPayloadByQueryId<T extends string> = Extract<
	Doc<"analyticsPipes">,
	{ queryId: T }
>["payload"];

// Type definition for sum primitives payload
type SumPrimitivesPayload = ExtractPayloadByQueryId<"sum-primitives">;

type CampaignSettings = Doc<"campaigns">["campaignSettings"];

// Calculate percentage change between current and previous values
function calculatePercentageChange(current: number, previous: number): number {
	if (previous === 0) {
		return current === 0 ? 0 : 100;
	}
	return ((current - previous) / previous) * 100;
}

// Determine trend based on percentage change and primary goal direction
function getTrend(
	percentageChange: number,
	primaryGoalDirection: "up" | "down",
): "positive" | "negative" | "neutral" {
	if (percentageChange === 0) return "neutral";

	const isIncrease = percentageChange > 0;

	if (primaryGoalDirection === "up") {
		return isIncrease ? "positive" : "negative";
	}

	return isIncrease ? "negative" : "positive";
}

// Create overview KPIs dynamically based on campaign settings
function createOverviewKPIs(campaignSettings?: CampaignSettings, isRealtime?: boolean): KPIConfig[] {
	// Get conversion goal direction from primary goal or default to "up"
	const getGoalDirection = (): "up" | "down" => {
		return campaignSettings?.primaryGoal?.direction || "up";
	};

	// Get currency symbol from campaign settings
	const currencySymbol = getCurrencySymbol(
		campaignSettings?.primaryGoal?.currency,
	);

	const allKPIs = [
		{
			id: "all_sessions",
			title: isRealtime ? "Active Sessions" : "Sessions",
			icon: Eye,
			getCurrentValue: (payload) => payload.current_all_sessions,
			getPreviousValue: (payload) => payload.previous_all_sessions,
			primaryGoalDirection: "up",
		},
		{
			id: "pageviews",
			title: "Events",
			icon: Eye,
			getCurrentValue: (payload) => payload.current_pageviews,
			getPreviousValue: (payload) => payload.previous_pageviews,
			primaryGoalDirection: "up",
			showOnlyInRealtime: true,
		},
		{
			id: "conversions",
			title: "Conversions",
			icon: Target,
			getCurrentValue: (payload) => payload.current_conversions,
			getPreviousValue: (payload) => payload.previous_conversions,
			primaryGoalDirection: getGoalDirection(),
		},
		{
			id: "conversion_rate",
			title: "Conversion Rate",
			icon: TrendingUp,
			getCurrentValue: (payload) => {
				if (payload.current_all_sessions === 0) return 0;
				return (
					(payload.current_conversions / payload.current_all_sessions) * 100
				);
			},
			getPreviousValue: (payload) => {
				if (payload.previous_all_sessions === 0) return 0;
				return (
					(payload.previous_conversions / payload.previous_all_sessions) * 100
				);
			},
			primaryGoalDirection: getGoalDirection(),
			suffix: "%",
			isPercentage: true,
			formatOptions: {
				maximumFractionDigits: 1,
			},
			hideInRealtime: true,
		},
		{
			id: "conversion_value",
			title: "Conversion Value",
			icon: Banknote,
			getCurrentValue: (payload) => payload.current_conversion_value,
			getPreviousValue: (payload) => payload.previous_conversion_value,
			primaryGoalDirection: getGoalDirection(),
			prefix: currencySymbol,
			formatOptions: {
				notation: "compact",
				maximumFractionDigits: 1,
			},
		},
	];

	// Filter KPIs based on realtime mode
	if (isRealtime) {
		return allKPIs.filter(kpi => !kpi.hideInRealtime);
	} else {
		return allKPIs.filter(kpi => !kpi.showOnlyInRealtime);
	}
}

interface KPICardsContainerProps {
	payload: SumPrimitivesPayload;
	source: Doc<"analyticsPipes">["source"];
	campaignSettings?: CampaignSettings;
	className?: string;
	isRealtime?: boolean;
}

export const KPICardsContainer = ({
	payload,
	campaignSettings,
	className,
	source,
	isRealtime = false,
}: KPICardsContainerProps) => {
	// Create KPIs dynamically based on campaign settings
	const kpisToShow = createOverviewKPIs(campaignSettings, isRealtime);

	return (
		<div
			className={cn(
				// Unified container - single row with equal width cards
				"grid w-full",
				// Responsive: 1 col on mobile, 2 on tablet, 4 on desktop
				"grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
				// Dark theme background to match screenshot
				"rounded-lg border bg-muted",
				className,
			)}
		>
			{kpisToShow.map((kpi) => {
				const currentValue = kpi.getCurrentValue(payload);
				const previousValue = kpi.getPreviousValue(payload);

				// For percentage metrics, don't calculate percentage change
				let percentageChange: number;
				if (kpi.isPercentage) {
					percentageChange = currentValue - previousValue; // Direct difference for percentage metrics
				} else {
					percentageChange = calculatePercentageChange(
						currentValue,
						previousValue,
					);
				}

				const trend = getTrend(percentageChange, kpi.primaryGoalDirection);

				return (
					<KPICard
						key={kpi.id}
						title={kpi.title}
						value={currentValue}
						previousValue={previousValue ?? 0}
						source={source}
						icon={kpi.icon}
						changePercent={isRealtime ? undefined : (
							kpi.isPercentage ? percentageChange : percentageChange / 100
						)}
						trend={isRealtime ? "neutral" : trend}
						suffix={kpi.suffix}
						prefix={kpi.prefix}
						formatOptions={kpi.formatOptions}
						isRealtime={isRealtime}
					/>
				);
			})}
		</div>
	);
};

// Export the KPI configurations for external use
export {
	createOverviewKPIs,
	type CampaignSettings,
	type KPIConfig,
	type SumPrimitivesPayload,
};
