"use client";

import { api, type Id, useCachedQuery, useMutation } from "@firebuzz/convex";
import { toast } from "@firebuzz/ui/lib/utils";

import { parseAsBoolean, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo, useRef } from "react";

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
	// Track which screens have been mounted and fetched
	const mountedScreensRef = useRef<Set<string>>(new Set());

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
			// Use environment-specific firstPublishedAt for all-time period
			const firstPublishedAt = currentIsPreview
				? campaign.previewFirstPublishedAt
				: campaign.productionFirstPublishedAt;

			// Fallback to publishedAt if environment-specific field is not available
			const startDate = firstPublishedAt || campaign.publishedAt;

			if (!startDate) return null;

			return {
				periodStart: startDate,
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
	}, [campaign, currentPeriod, currentIsPreview]);

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

	// Debug logging for realtime query
	useEffect(() => {
		if (currentScreen === "realtime") {
			console.log("Realtime Query Debug:", {
				shouldFetchAnalytics,
				currentIsPreview,
				campaignEnvironment: currentIsPreview ? "preview" : "production",
				realtimeOverviewQuery,
				hasData: !!realtimeOverviewQuery,
			});
		}
	}, [
		currentScreen,
		shouldFetchAnalytics,
		currentIsPreview,
		realtimeOverviewQuery,
	]);

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

			// Track if any query was rate limited
			let hasRateLimitError = false;

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

				console.log("Realtime revalidation:", {
					conversionEventId,
					currentIsPreview,
					campaignEnvironment: currentIsPreview ? "preview" : "production",
				});

				if (!conversionEventId) {
					console.error("No conversion event ID found for realtime");
					throw new Error(
						"Unable to determine conversion event ID for realtime analytics",
					);
				}

				// Use last 30 minutes for realtime data
				const now = new Date();
				const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
				const realtimeQuery = {
					queryId: "realtime-overview" as const,
					period: currentPeriod,
					periodStart: thirtyMinutesAgo.toISOString(),
					periodEnd: now.toISOString(),
					conversionEventId,
					campaignEnvironment: currentIsPreview
						? ("preview" as const)
						: ("production" as const),
				};

				console.log("Pushing realtime query:", realtimeQuery);
				queries.push(realtimeQuery);
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
				console.log(
					"Calling revalidateAnalyticsMutation with queries:",
					queries,
				);
				const result = await revalidateAnalyticsMutation({
					campaignId,
					queries,
				});

				console.log("Mutation result:", result);

				// Check if any queries were rate limited
				if (result?.results) {
					for (const queryResult of result.results) {
						if (
							!queryResult.scheduled &&
							queryResult.error?.includes("10 seconds")
						) {
							hasRateLimitError = true;
							break;
						}
					}
				}
			} else {
				console.log("No queries to revalidate");
			}

			// Show toast feedback
			if (hasRateLimitError) {
				toast.error("Please wait a moment", {
					id: "analytics-rate-limit",
					description: "You can refresh analytics every 10 seconds",
				});
			} else if (queries.length > 0) {
				// Show success toast only if queries were scheduled
				toast.success("Analytics refreshed", {
					id: "analytics-refresh-success",
				});
			}
		} catch (error) {
			console.error("Analytics refresh error:", error);
			toast.error("Failed to refresh analytics", {
				id: "analytics-refresh-error",
				description:
					error instanceof Error
						? error.message
						: "An unexpected error occurred",
			});
			// Don't re-throw, just log the error
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

	// Mount-only revalidation - trigger once per screen on first visit
	useEffect(() => {
		// Create a unique key for this screen + period + environment combination
		const screenKey = `${currentScreen}-${currentPeriod}-${currentIsPreview ? "preview" : "production"}`;

		console.log("Mount effect triggered:", {
			screenKey,
			shouldFetchAnalytics,
			isPublished: campaign?.isPublished,
			alreadyMounted: mountedScreensRef.current.has(screenKey),
			periodDates,
		});

		// Only revalidate if we have everything we need and the campaign is published
		if (!shouldFetchAnalytics || !campaign?.isPublished) {
			console.log("Skipping mount revalidation:", {
				shouldFetchAnalytics,
				isPublished: campaign?.isPublished,
			});
			return;
		}

		// Check if we've already fetched for this screen combination
		if (mountedScreensRef.current.has(screenKey)) {
			console.log("Already fetched for:", screenKey);
			return;
		}

		// Mark this screen as mounted
		mountedScreensRef.current.add(screenKey);
		console.log("Triggering initial revalidation for:", screenKey);

		// Trigger initial load with a small delay
		const initialTimeoutId = setTimeout(() => {
			revalidate().catch((error) => {
				console.error(
					`Initial revalidation failed for ${currentScreen}:`,
					error,
				);
			});
		}, 300);

		return () => {
			clearTimeout(initialTimeoutId);
		};
	}, [
		shouldFetchAnalytics,
		campaign?.isPublished,
		currentScreen,
		currentPeriod,
		currentIsPreview,
		revalidate,
		periodDates,
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
