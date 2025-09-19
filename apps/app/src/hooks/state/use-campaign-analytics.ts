"use client";

import { type Id, api, useCachedQuery, useMutation } from "@firebuzz/convex";

import { parseAsBoolean, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo } from "react";

// Period configuration
export const ANALYTICS_PERIODS = {
	"7d": { label: "Last 7 days", days: 7 },
	"15d": { label: "Last 15 days", days: 15 },
	"30d": { label: "Last 30 days", days: 30 },
	"all-time": { label: "All time", days: null }, // null means from publishedAt
} as const;

export type AnalyticsPeriod = keyof typeof ANALYTICS_PERIODS;

// Screen types - extensible for future screens
export type AnalyticsScreen =
	| "overview"
	| "realtime"
	| "audience"
	| "conversions"
	| "ab-tests";

// Hook configuration
interface UseCampaignAnalyticsConfig {
	campaignId: Id<"campaigns">;
}

export function useCampaignAnalytics({
	campaignId,
}: UseCampaignAnalyticsConfig) {
	// URL state management with nuqs
	const [{ period, screen, isPreview }, setQueryStates] = useQueryStates({
		period: parseAsStringLiteral(
			Object.keys(ANALYTICS_PERIODS) as AnalyticsPeriod[],
		),
		screen: parseAsStringLiteral([
			"overview",
			"realtime",
			"audience",
			"conversions",
			"ab-tests",
		] as const),
		isPreview: parseAsBoolean,
	});

	// Get all analytics-related data in one query
	const campaignAnalyticsData = useCachedQuery(
		api.collections.campaigns.queries.getCampaignDataForAnalytics,
		campaignId ? { campaignId } : "skip",
	);

	// Extract individual pieces for backward compatibility
	const campaign = campaignAnalyticsData?.campaign;
	const landingPages = campaignAnalyticsData?.landingPages;
	const abTests = campaignAnalyticsData?.abTests;
	const primaryConversionEventId = campaignAnalyticsData?.conversionEventId;
	const customEvents = campaignAnalyticsData?.customEvents;

	// Loading and error states for campaign data
	const isCampaignLoading = campaignAnalyticsData === undefined;
	const isCampaignError = campaignAnalyticsData === null;

	// Set defaults
	const currentPeriod: AnalyticsPeriod = period ?? "7d";
	const currentScreen: AnalyticsScreen = screen ?? "overview";
	const currentIsPreview: boolean = isPreview ?? campaign?.status === "preview";

	// Calculate period dates based on selection
	const periodDates = useMemo((): {
		periodStart: string;
		periodEnd: string;
	} | null => {
		if (!campaign) return null;

		const now = new Date();
		const periodEnd = now.toISOString();

		if (currentPeriod === "all-time") {
			// Use publishedAt as start date for all-time
			if (!campaign.publishedAt) return null;
			return {
				periodStart: campaign.publishedAt,
				periodEnd,
			};
		}

		// Calculate start date based on period days
		const periodConfig = ANALYTICS_PERIODS[currentPeriod];
		const periodStart = new Date(now);
		periodStart.setDate(periodStart.getDate() - periodConfig.days);

		const result = {
			periodStart: periodStart.toISOString(),
			periodEnd,
		};

		return result;
	}, [campaign, currentPeriod]);

	// Check if we should fetch analytics data
	const shouldFetchAnalytics = useMemo(() => {
		return !!(
			(campaign?.status === "published" ||
				campaign?.status === "preview" ||
				campaign?.status === "completed") &&
			periodDates
		);
	}, [campaign, periodDates]);

	// Query sum-primitives analytics data
	const sumPrimitivesQuery = useCachedQuery(
		api.collections.analytics.queries.getSumPrimitives,
		shouldFetchAnalytics
			? {
					campaignId,
					period: currentPeriod,
					campaignEnvironment: currentIsPreview ? "preview" : "production",
				}
			: "skip",
	);

	// Query timeseries-primitives analytics data
	const timeseriesPrimitivesQuery = useCachedQuery(
		api.collections.analytics.queries.getTimeseriesPrimitives,
		shouldFetchAnalytics
			? {
					campaignId,
					period: currentPeriod,
					campaignEnvironment: currentIsPreview ? "preview" : "production",
				}
			: "skip",
	);

	// Query audience breakdown analytics data
	const audienceBreakdownQuery = useCachedQuery(
		api.collections.analytics.queries.getAudienceBreakdown,
		shouldFetchAnalytics
			? {
					campaignId,
					period: currentPeriod,
					campaignEnvironment: currentIsPreview ? "preview" : "production",
				}
			: "skip",
	);

	// Query conversions breakdown analytics data
	const conversionsBreakdownQuery = useCachedQuery(
		api.collections.analytics.queries.getConversionsBreakdown,
		shouldFetchAnalytics
			? {
					campaignId,
					period: currentPeriod,
					campaignEnvironment: currentIsPreview ? "preview" : "production",
				}
			: "skip",
	);

	// Query realtime overview analytics data
	const realtimeOverviewQuery = useCachedQuery(
		api.collections.analytics.queries.getRealtimeOverview,
		shouldFetchAnalytics
			? {
					campaignId,
					period: currentPeriod,
					campaignEnvironment: currentIsPreview ? "preview" : "production",
				}
			: "skip",
	);

	// Query AB test results analytics data - handle multiple tests
	const abTestResultsQuery = useCachedQuery(
		api.collections.analytics.queries.getAbTestResults,
		shouldFetchAnalytics &&
			abTests &&
			abTests.length > 0 &&
			primaryConversionEventId
			? {
					campaignId,
					campaignEnvironment: currentIsPreview ? "preview" : "production",
					// Pass all AB test IDs and their conversion event IDs, filter out invalid ones
					abTestConfigs: abTests
						.map((abTest) => ({
							abTestId: abTest.id,
							conversionEventId: (abTest.primaryGoalId ||
								primaryConversionEventId) as string,
						}))
						.filter(
							(
								config,
							): config is { abTestId: string; conversionEventId: string } =>
								config.conversionEventId !== undefined,
						),
				}
			: "skip",
	);

	// Mutation for revalidating analytics
	const revalidateAnalyticsMutation = useMutation(
		api.collections.analytics.mutations.revalidateAnalytics,
	);

	// Helper functions for URL state changes
	const setPeriod = (newPeriod: AnalyticsPeriod) => {
		setQueryStates({ period: newPeriod });
	};

	const setScreen = (newScreen: AnalyticsScreen) => {
		setQueryStates({ screen: newScreen });
	};

	const setIsPreview = (newIsPreview: boolean) => {
		setQueryStates({ isPreview: newIsPreview });
	};

	// Revalidate function - screen-specific queries
	const revalidate = useCallback(async () => {
		if (!shouldFetchAnalytics || !campaign) return;

		try {
			const queries = [];

			// Add queries based on current screen
			if (currentScreen === "overview") {
				// Overview screen requires periodDates
				if (!periodDates) return;
				// Use conversion event ID from analytics data
				const conversionEventId = primaryConversionEventId;

				// Ensure conversionEventId is never undefined
				if (!conversionEventId) {
					console.error("No conversion event ID found, using fallback");
					throw new Error(
						"Unable to determine conversion event ID for analytics",
					);
				}

				// Overview screen uses sum-primitives and timeseries-primitives queries
				queries.push({
					queryId: "sum-primitives" as const,
					period: currentPeriod,
					periodStart: periodDates.periodStart,
					periodEnd: periodDates.periodEnd,
					conversionEventId,
					campaignEnvironment: currentIsPreview
						? ("preview" as const)
						: ("production" as const),
					eventIds: customEvents?.map((event) => event.id).join(","), // Optional string field for custom events
				});

				// Add timeseries query for charts
				const timeseries_query = {
					queryId: "timeseries-primitives" as const,
					period: currentPeriod,
					periodStart: periodDates.periodStart,
					periodEnd: periodDates.periodEnd,
					conversionEventId,
					campaignEnvironment: currentIsPreview
						? ("preview" as const)
						: ("production" as const),
					granularity: "day" as const, // Default to daily data
					eventIds: customEvents?.map((event) => event.id).join(","), // Optional string field for custom events
				};

				console.log("Revalidating analytics with parameters:", {
					currentPeriod,
					periodConfig: ANALYTICS_PERIODS[currentPeriod],
					timeseries_query,
				});

				queries.push(timeseries_query);

				// Add audience breakdown query for overview charts
				queries.push({
					queryId: "audience-breakdown" as const,
					period: currentPeriod,
					periodStart: periodDates.periodStart,
					periodEnd: periodDates.periodEnd,
					campaignEnvironment: currentIsPreview
						? ("preview" as const)
						: ("production" as const),
				});

				// Add conversions breakdown query for overview charts
				queries.push({
					queryId: "conversions-breakdown" as const,
					period: currentPeriod,
					periodStart: periodDates.periodStart,
					periodEnd: periodDates.periodEnd,
					conversionEventId,
					campaignEnvironment: currentIsPreview
						? ("preview" as const)
						: ("production" as const),
					eventIds: customEvents?.map((event) => event.id).join(","), // Optional string field for custom events
				});
			} else if (currentScreen === "realtime") {
				// Realtime screen only needs realtime-overview query
				const conversionEventId = primaryConversionEventId;

				if (!conversionEventId) {
					console.error("No conversion event ID found for realtime");
					throw new Error(
						"Unable to determine conversion event ID for realtime analytics",
					);
				}

				// Use last 30 minutes for realtime data
				const now = new Date();
				const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
				queries.push({
					queryId: "realtime-overview" as const,
					period: currentPeriod,
					periodStart: thirtyMinutesAgo.toISOString(),
					periodEnd: now.toISOString(),
					conversionEventId,
					campaignEnvironment: currentIsPreview
						? ("preview" as const)
						: ("production" as const),
				});
			} else if (currentScreen === "conversions") {
				// Conversions screen requires periodDates
				if (!periodDates) return;
				// Use conversion event ID from analytics data
				const conversionEventId = primaryConversionEventId;

				// Ensure conversionEventId is never undefined
				if (!conversionEventId) {
					console.error("No conversion event ID found, using fallback");
					throw new Error(
						"Unable to determine conversion event ID for conversions analytics",
					);
				}

				// Conversions screen uses conversions-breakdown and timeseries-primitives queries
				queries.push({
					queryId: "conversions-breakdown" as const,
					period: currentPeriod,
					periodStart: periodDates.periodStart,
					periodEnd: periodDates.periodEnd,
					conversionEventId,
					campaignEnvironment: currentIsPreview
						? ("preview" as const)
						: ("production" as const),
					eventIds: customEvents?.map((event) => event.id).join(","), // Optional string field for custom events
				});

				// Add timeseries query for cumulative value chart
				queries.push({
					queryId: "timeseries-primitives" as const,
					period: currentPeriod,
					periodStart: periodDates.periodStart,
					periodEnd: periodDates.periodEnd,
					conversionEventId,
					campaignEnvironment: currentIsPreview
						? ("preview" as const)
						: ("production" as const),
					granularity: "day" as const, // Default to daily data
					eventIds: customEvents?.map((event) => event.id).join(","), // Optional string field for custom events
				});
			} else if (currentScreen === "audience") {
				// Audience screen requires periodDates
				if (!periodDates) return;

				// Audience screen uses audience-breakdown and timeseries-primitives queries
				queries.push({
					queryId: "audience-breakdown" as const,
					period: currentPeriod,
					periodStart: periodDates.periodStart,
					periodEnd: periodDates.periodEnd,
					campaignEnvironment: currentIsPreview
						? ("preview" as const)
						: ("production" as const),
				});

				// Add timeseries query for audience trends
				const conversionEventId = primaryConversionEventId;

				if (conversionEventId) {
					queries.push({
						queryId: "timeseries-primitives" as const,
						period: currentPeriod,
						periodStart: periodDates.periodStart,
						periodEnd: periodDates.periodEnd,
						conversionEventId,
						campaignEnvironment: currentIsPreview
							? ("preview" as const)
							: ("production" as const),
						granularity: "day" as const, // Default to daily data
						eventIds: customEvents?.map((event) => event.id).join(","), // Optional string field for custom events
					});
				}
			} else if (currentScreen === "ab-tests") {
				// AB tests screen requires periodDates
				if (!periodDates) return;

				// Use AB test nodes from analytics data
				const abTestsData = campaignAnalyticsData?.abTests || [];

				if (abTestsData.length > 0 && primaryConversionEventId) {
					// Filter out A/B tests without valid conversion event IDs
					const validAbTestConfigs = abTestsData
						.map((abTest) => ({
							abTestId: abTest.id,
							conversionEventId:
								abTest.primaryGoalId || primaryConversionEventId,
							confidenceLevel: abTest.confidenceLevel || 95,
						}))
						.filter((config) => config.conversionEventId !== undefined);

					if (validAbTestConfigs.length > 0) {
						// Add AB test results query that handles multiple tests
						for (const config of validAbTestConfigs) {
							queries.push({
								queryId: "ab-test-result" as const,
								abTestId: config.abTestId,
								conversionEventId: config.conversionEventId,
								confidenceLevel: config.confidenceLevel,
								campaignEnvironment: currentIsPreview
									? ("preview" as const)
									: ("production" as const),
							});
						}
					}
				}
			}

			// Future screens can add more queries here

			if (queries.length > 0) {
				await revalidateAnalyticsMutation({
					campaignId,
					queries,
				});
			}
		} catch (error) {
			console.error(error);
			throw error;
		}
	}, [
		shouldFetchAnalytics,
		periodDates,
		campaign,
		currentScreen,
		currentIsPreview,
		currentPeriod,
		campaignId,
		revalidateAnalyticsMutation,
		primaryConversionEventId,
		customEvents,
		campaignAnalyticsData,
	]);

	// Auto-revalidate when period changes or screen changes with different intervals
	useEffect(() => {
		// Only revalidate if we have everything we need and the campaign is published
		if (shouldFetchAnalytics && campaign?.isPublished) {
			// For realtime screen, period changes don't matter, but we need to start auto-refresh
			if (currentScreen === "realtime") {
				// Initial load
				const initialTimeoutId = setTimeout(() => {
					revalidate().catch((error) => {
						console.error("Initial realtime revalidation failed:", error);
					});
				}, 300);

				// Auto-refresh every 30 seconds for realtime
				const intervalId = setInterval(() => {
					revalidate().catch((error) => {
						console.error("Realtime auto-revalidation failed:", error);
					});
				}, 30000); // 30 seconds

				return () => {
					clearTimeout(initialTimeoutId);
					clearInterval(intervalId);
				};
			}
			if (
				periodDates &&
				(currentScreen === "overview" ||
					currentScreen === "conversions" ||
					currentScreen === "audience" ||
					currentScreen === "ab-tests")
			) {
				// For overview, conversions, audience, and AB tests screens, revalidate when period changes
				const initialTimeoutId = setTimeout(() => {
					revalidate().catch((error) => {
						console.error(
							`Auto-revalidation failed for ${currentScreen}:`,
							error,
						);
					});
				}, 300);

				// Auto-refresh every 3 minutes for these screens
				const intervalId = setInterval(() => {
					revalidate().catch((error) => {
						console.error(`${currentScreen} auto-revalidation failed:`, error);
					});
				}, 180000); // 3 minutes

				return () => {
					clearTimeout(initialTimeoutId);
					clearInterval(intervalId);
				};
			}
		}
	}, [
		shouldFetchAnalytics,
		periodDates,
		campaign?.isPublished,
		currentScreen,
		revalidate,
	]);

	// Aggregate all analytics data
	const data = useMemo(() => {
		return {
			sumPrimitives: sumPrimitivesQuery,
			timeseriesPrimitives: timeseriesPrimitivesQuery,
			audienceBreakdown: audienceBreakdownQuery,
			conversionsBreakdown: conversionsBreakdownQuery,
			realtimeOverview: realtimeOverviewQuery,
			abTestResults: abTestResultsQuery,
			// Use consolidated campaign data
			campaign,
			abTests,
			landingPages,
			conversionEventId: primaryConversionEventId,
			customEvents,
		};
	}, [
		sumPrimitivesQuery,
		timeseriesPrimitivesQuery,
		audienceBreakdownQuery,
		conversionsBreakdownQuery,
		realtimeOverviewQuery,
		abTestResultsQuery,
		abTests,
		campaign,
		customEvents,
		landingPages,
		primaryConversionEventId,
	]);

	const isRevalidating = useMemo(() => {
		if (currentScreen === "realtime") {
			return realtimeOverviewQuery?.isRefreshing ?? false;
		}
		if (currentScreen === "overview") {
			return (
				sumPrimitivesQuery?.isRefreshing ??
				timeseriesPrimitivesQuery?.isRefreshing ??
				false
			);
		}

		if (currentScreen === "conversions") {
			return (
				conversionsBreakdownQuery?.isRefreshing ??
				timeseriesPrimitivesQuery?.isRefreshing ??
				false
			);
		}

		if (currentScreen === "audience") {
			return (
				audienceBreakdownQuery?.isRefreshing ??
				timeseriesPrimitivesQuery?.isRefreshing ??
				false
			);
		}

		if (currentScreen === "ab-tests") {
			return (
				abTestResultsQuery?.some((result) => result?.isRefreshing) ?? false
			);
		}

		return false;
	}, [
		realtimeOverviewQuery?.isRefreshing,
		sumPrimitivesQuery?.isRefreshing,
		timeseriesPrimitivesQuery?.isRefreshing,
		conversionsBreakdownQuery?.isRefreshing,
		audienceBreakdownQuery?.isRefreshing,
		abTestResultsQuery,
		currentScreen,
	]);

	const isLoading = useMemo(() => {
		if (currentScreen === "realtime") {
			return isRevalidating && !realtimeOverviewQuery;
		}

		if (currentScreen === "overview") {
			return (
				isRevalidating && !sumPrimitivesQuery && !timeseriesPrimitivesQuery
			);
		}
		if (currentScreen === "conversions") {
			return (
				isRevalidating &&
				!conversionsBreakdownQuery &&
				!timeseriesPrimitivesQuery
			);
		}
		if (currentScreen === "audience") {
			return (
				isRevalidating && !audienceBreakdownQuery && !timeseriesPrimitivesQuery
			);
		}
		if (currentScreen === "ab-tests") {
			return (
				isRevalidating &&
				(!abTestResultsQuery || abTestResultsQuery.length === 0)
			);
		}
		return false;
	}, [
		isRevalidating,
		sumPrimitivesQuery,
		timeseriesPrimitivesQuery,
		conversionsBreakdownQuery,
		audienceBreakdownQuery,
		realtimeOverviewQuery,
		abTestResultsQuery,
		currentScreen,
	]);

	return {
		// Campaign data
		campaign,

		// Current state
		period: currentPeriod,
		screen: currentScreen,
		isPreview: currentIsPreview,
		periodDates,

		// Period utilities
		availablePeriods: ANALYTICS_PERIODS,
		setPeriod,

		// Preview utilities
		setIsPreview,

		// Screen navigation
		currentScreen,
		setScreen,

		// Analytics data
		data,

		// Status flags
		isLoading,
		isCampaignLoading,
		isCampaignError,
		isRevalidating,

		// Actions
		revalidate,
	};
}
