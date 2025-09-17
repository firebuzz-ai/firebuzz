import type { LucideIcon } from "@firebuzz/ui/icons/lucide";
import {
	Banknote,
	Eye,
	Target,
	TrendingUp,
	Users,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { getCurrencySymbol } from "@firebuzz/utils";

import type { Doc } from "@firebuzz/convex";
import { KPICard } from "../charts/kpi-card";

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
function createOverviewKPIs(
	campaignSettings?: CampaignSettings,
	isRealtime?: boolean,
): KPIConfig[] {
	// Get conversion goal direction from primary goal or default to "up"
	const getGoalDirection = (): "up" | "down" => {
		const direction = campaignSettings?.primaryGoal?.direction;
		return direction === "up" || direction === "down" ? direction : "up";
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
			getCurrentValue: (payload: SumPrimitivesPayload) =>
				payload.current_all_sessions,
			getPreviousValue: (payload: SumPrimitivesPayload) =>
				payload.previous_all_sessions,
			primaryGoalDirection: "up" as const,
		},
		{
			id: "pageviews",
			title: "Events",
			icon: Eye,
			getCurrentValue: (payload: SumPrimitivesPayload) =>
				payload.current_pageviews,
			getPreviousValue: (payload: SumPrimitivesPayload) =>
				payload.previous_pageviews,
			primaryGoalDirection: "up" as const,
			showOnlyInRealtime: true,
		},
		{
			id: "conversions",
			title: "Conversions",
			icon: Target,
			getCurrentValue: (payload: SumPrimitivesPayload) =>
				payload.current_conversions,
			getPreviousValue: (payload: SumPrimitivesPayload) =>
				payload.previous_conversions,
			primaryGoalDirection: getGoalDirection(),
		},
		{
			id: "conversion_rate",
			title: "Conversion Rate",
			icon: TrendingUp,
			getCurrentValue: (payload: SumPrimitivesPayload) => {
				if (payload.current_all_sessions === 0) return 0;
				return (
					(payload.current_conversions / payload.current_all_sessions) * 100
				);
			},
			getPreviousValue: (payload: SumPrimitivesPayload) => {
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
			getCurrentValue: (payload: SumPrimitivesPayload) =>
				payload.current_conversion_value,
			getPreviousValue: (payload: SumPrimitivesPayload) =>
				payload.previous_conversion_value,
			primaryGoalDirection: getGoalDirection(),
			prefix: currencySymbol,
			formatOptions: {
				notation: "compact" as const,
				maximumFractionDigits: 1,
			},
		},
	];

	// Filter KPIs based on realtime mode
	if (isRealtime) {
		return allKPIs.filter((kpi) => !kpi.hideInRealtime);
	}

	return allKPIs.filter((kpi) => !kpi.showOnlyInRealtime);
}

// Create custom KPIs for specific screens like audience
function createCustomKPIs(
	customKPIs: CustomKPI[],
	campaignSettings?: CampaignSettings,
): KPIConfig[] {
	const iconMap: Record<string, LucideIcon> = {
		users: Users,
		sessions: Eye,
		new_sessions: TrendingUp,
		returning_sessions: Target,
		conversions: Target,
		conversion_value: Banknote,
		conversion_rate: TrendingUp,
		avg_conversion_value: Banknote,
	};

	// Get currency symbol from campaign settings
	const currencySymbol = getCurrencySymbol(
		campaignSettings?.primaryGoal?.currency,
	);

	return customKPIs.map((customKPI) => ({
		id: customKPI.id,
		title: customKPI.title,
		icon: iconMap[customKPI.id] || Eye,
		getCurrentValue: (payload: SumPrimitivesPayload) =>
			payload[customKPI.field] as number,
		getPreviousValue: (payload: SumPrimitivesPayload) => {
			// Map current fields to previous fields
			const previousFieldMap: Record<string, keyof SumPrimitivesPayload> = {
				current_users: "previous_users",
				current_all_sessions: "previous_all_sessions",
				current_new_sessions: "previous_new_sessions",
				current_returning_sessions: "previous_returning_sessions",
				current_conversions: "previous_conversions",
				current_conversion_value: "previous_conversion_value",
			};
			const previousField = previousFieldMap[customKPI.field as string];
			return previousField ? (payload[previousField] as number) : 0;
		},
		primaryGoalDirection: "up" as const,
		prefix:
			customKPI.prefix ||
			(customKPI.id.includes("value") ? currencySymbol : undefined),
		suffix:
			customKPI.suffix ||
			(customKPI.id === "conversion_rate" ? "%" : undefined),
		formatOptions:
			customKPI.formatOptions ||
			(customKPI.id.includes("value")
				? {
						notation: "compact" as const,
						maximumFractionDigits: 1,
					}
				: undefined),
		isPercentage: customKPI.isPercentage || customKPI.id === "conversion_rate",
	}));
}

interface CustomKPI {
	id: string;
	title: string;
	field: keyof SumPrimitivesPayload;
	prefix?: string;
	suffix?: string;
	formatOptions?: {
		notation?: "standard" | "compact";
		maximumFractionDigits?: number;
	};
	isPercentage?: boolean;
}

interface KPICardsContainerProps {
	payload: SumPrimitivesPayload;
	source: Doc<"analyticsPipes">["source"];
	campaignSettings?: CampaignSettings;
	className?: string;
	isRealtime?: boolean;
	customKPIs?: CustomKPI[];
}

export const KPICardsContainer = ({
	payload,
	campaignSettings,
	className,
	source,
	isRealtime = false,
	customKPIs,
}: KPICardsContainerProps) => {
	// Create KPIs dynamically based on campaign settings or use custom KPIs
	const kpisToShow = customKPIs
		? createCustomKPIs(customKPIs, campaignSettings)
		: createOverviewKPIs(campaignSettings, isRealtime);

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
						changePercent={
							isRealtime
								? undefined
								: kpi.isPercentage
									? percentageChange
									: percentageChange / 100
						}
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
