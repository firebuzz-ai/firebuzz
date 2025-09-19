"use client";

import { EmptyState } from "@/components/analytics/states";
import { useCampaignAnalytics } from "@/hooks/state/use-campaign-analytics";
import type { Id } from "@firebuzz/convex";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { useMemo } from "react";
import { AbTestItem } from "./charts/ab-test-item";

// Helper function to infer the processed AB test type
const processAbTests = (
	abTests: ReturnType<typeof useCampaignAnalytics>["data"]["abTests"],
	landingPages: ReturnType<typeof useCampaignAnalytics>["data"]["landingPages"],
	abTestResults: ReturnType<
		typeof useCampaignAnalytics
	>["data"]["abTestResults"],
) => {
	const allAbtests = abTests || [];
	const allLandingPages = landingPages || [];
	// Filter out null/undefined results to ensure type safety
	const allAbTestResults = (abTestResults || []).filter(
		(result): result is NonNullable<typeof result> =>
			result !== null && result !== undefined,
	);

	return allAbtests.map((abTest) => {
		return {
			...abTest,
			variants: abTest.variants.map((variant) => {
				return {
					...variant,
					landingPage:
						allLandingPages.find(
							(landingPage) => landingPage._id === variant.landingPageId,
						) || null,
				};
			}),
			analytics: allAbTestResults.find(
				(result) => result.abTestId === abTest.id,
			),
		};
	});
};

export type AbTestWithResults = ReturnType<typeof processAbTests>[number];

interface CampaignAnalyticsAbtestProps {
	campaignId: Id<"campaigns">;
}

export const CampaignAnalyticsAbtest = ({
	campaignId,
}: CampaignAnalyticsAbtestProps) => {
	const { data, isLoading } = useCampaignAnalytics({ campaignId });

	const abTests = useMemo(
		() =>
			processAbTests(data?.abTests, data?.landingPages, data?.abTestResults),
		[data?.abTests, data?.landingPages, data?.abTestResults],
	);

	console.log({ abTests });

	const overAllConversionRateOfCampaign = useMemo(() => {
		return data?.conversionsBreakdown?.payload.overall_conversion_rate || 0;
	}, [data?.conversionsBreakdown]);

	// Show loading state
	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<Skeleton className="h-10 w-[180px]" />
					<div className="flex gap-4 items-center">
						<Skeleton className="w-20 h-6" />
						<Skeleton className="w-20 h-9" />
					</div>
				</div>
				<div className="grid grid-cols-1 gap-4 p-4 rounded-xl border sm:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`abtest-skeleton-${
								// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
								i
							}`}
							className="p-4 space-y-3 rounded-lg border"
						>
							<div className="flex justify-between items-center">
								<div className="flex gap-2 items-center">
									<Skeleton className="w-4 h-4 rounded" />
									<Skeleton className="w-20 h-4" />
								</div>
								<Skeleton className="w-4 h-4 rounded" />
							</div>
							<Skeleton className="w-16 h-8" />
							<div className="flex justify-between items-center">
								<Skeleton className="w-12 h-4" />
								<Skeleton className="w-16 h-3" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	// Show no data state
	if (!data.abTestResults && !data.abTests?.length) {
		return <EmptyState />;
	}

	return (
		<div className="flex overflow-hidden relative flex-col max-h-full">
			{/* Gradient background - Top */}
			<div className="absolute top-0 right-0 left-0 z-10 h-5 bg-gradient-to-b to-transparent from-background" />
			<div className="overflow-y-auto relative pt-5 pb-6 space-y-6 max-h-full">
				{abTests.map((abTest) => (
					<AbTestItem
						key={abTest.id}
						abTest={abTest}
						campaignConversionRate={overAllConversionRateOfCampaign}
						campaign={data?.campaign}
					/>
				))}
			</div>
			{/* Gradient background - Bottom */}
			<div className="absolute right-0 bottom-0 left-0 z-10 h-6 bg-gradient-to-b from-transparent to-background" />
		</div>
	);
};
