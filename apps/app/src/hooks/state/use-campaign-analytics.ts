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
export type AnalyticsScreen = "overview";

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
      Object.keys(ANALYTICS_PERIODS) as AnalyticsPeriod[]
    ),
    screen: parseAsStringLiteral(["overview"] as const),
    isPreview: parseAsBoolean,
  });

  // Fetch campaign data
  const campaign = useCachedQuery(api.collections.campaigns.queries.getById, {
    id: campaignId,
  });

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
    if (!campaign.isPublished) return null;

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

    console.log("Period calculation:", {
      currentPeriod,
      periodConfig,
      now: now.toISOString(),
      calculatedStart: periodStart.toISOString(),
      calculatedEnd: periodEnd,
      daysDifference: Math.floor(
        (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
      ),
    });

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
    shouldFetchAnalytics ? { campaignId } : "skip"
  );

  // Query timeseries-primitives analytics data
  const timeseriesPrimitivesQuery = useCachedQuery(
    api.collections.analytics.queries.getTimeseriesPrimitives,
    shouldFetchAnalytics ? { campaignId } : "skip"
  );

  // Query audience breakdown analytics data
  const audienceBreakdownQuery = useCachedQuery(
    api.collections.analytics.queries.getAudienceBreakdown,
    shouldFetchAnalytics ? { campaignId } : "skip"
  );

  // Query conversions breakdown analytics data
  const conversionsBreakdownQuery = useCachedQuery(
    api.collections.analytics.queries.getConversionsBreakdown,
    shouldFetchAnalytics ? { campaignId } : "skip"
  );

  // Query realtime overview analytics data
  const realtimeOverviewQuery = useCachedQuery(
    api.collections.analytics.queries.getRealtimeOverview,
    shouldFetchAnalytics ? { campaignId } : "skip"
  );

  // Query all landing pages for the campaign
  const landingPagesQuery = useCachedQuery(
    api.collections.landingPages.queries.getByCampaignId,
    { campaignId }
  );

  // Mutation for revalidating analytics
  const revalidateAnalyticsMutation = useMutation(
    api.collections.analytics.mutations.revalidateAnalytics
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

  // Revalidate function - hardcoded for current screens
  const revalidate = useCallback(async () => {
    if (!shouldFetchAnalytics || !periodDates || !campaign) return;

    try {
      const queries = [];

      // Add queries based on current screen
      if (currentScreen === "overview") {
        // Get conversion event ID from campaign settings
        const conversionEventId =
          campaign.campaignSettings?.primaryGoal?.id ||
          (campaign.type === "lead-generation"
            ? "form-submission"
            : "external-link-click");

        // Ensure conversionEventId is never undefined
        if (!conversionEventId) {
          console.error("No conversion event ID found, using fallback");
          throw new Error("Unable to determine conversion event ID for analytics");
        }


        // Overview screen uses sum-primitives and timeseries-primitives queries
        queries.push({
          queryId: "sum-primitives" as const,
          periodStart: periodDates.periodStart,
          periodEnd: periodDates.periodEnd,
          conversionEventId,
          campaignEnvironment: currentIsPreview
            ? ("preview" as const)
            : ("production" as const),
          eventIds: campaign.campaignSettings?.customEvents
            ?.map((event) => event.id)
            .join(","), // Optional string field for custom events
        });

        // Add timeseries query for charts
        const timeseries_query = {
          queryId: "timeseries-primitives" as const,
          periodStart: periodDates.periodStart,
          periodEnd: periodDates.periodEnd,
          conversionEventId,
          campaignEnvironment: currentIsPreview
            ? ("preview" as const)
            : ("production" as const),
          granularity: "day" as const, // Default to daily data
          eventIds: campaign.campaignSettings?.customEvents
            ?.map((event) => event.id)
            .join(","), // Optional string field for custom events
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
          periodStart: periodDates.periodStart,
          periodEnd: periodDates.periodEnd,
          campaignEnvironment: currentIsPreview
            ? ("preview" as const)
            : ("production" as const),
        });

        // Add conversions breakdown query for overview charts
        queries.push({
          queryId: "conversions-breakdown" as const,
          periodStart: periodDates.periodStart,
          periodEnd: periodDates.periodEnd,
          conversionEventId,
          campaignEnvironment: currentIsPreview
            ? ("preview" as const)
            : ("production" as const),
          eventIds: campaign.campaignSettings?.customEvents
            ?.map((event) => event.id)
            .join(","), // Optional string field for custom events
        });

        // Add realtime overview query (use last 30 minutes)
        const now = new Date();
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
        queries.push({
          queryId: "realtime-overview" as const,
          periodStart: thirtyMinutesAgo.toISOString(),
          periodEnd: now.toISOString(),
          conversionEventId,
          campaignEnvironment: currentIsPreview
            ? ("preview" as const)
            : ("production" as const),
        });
      }

      // Future screens can add more queries here
      // if (currentScreen === "funnel") {
      //   queries.push({ ... });
      // }

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
  ]);

  // Auto-revalidate when period changes
  useEffect(() => {
    // Only revalidate if we have everything we need and the campaign is published
    if (shouldFetchAnalytics && periodDates && campaign?.isPublished) {
      // Add a small delay to avoid too many revalidations during rapid period changes
      const timeoutId = setTimeout(() => {
        revalidate().catch((error) => {
          console.error("Auto-revalidation failed:", error);
        });
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [shouldFetchAnalytics, periodDates, campaign?.isPublished, revalidate]);

  // Loading states
  const isLoading = useMemo(() => {
    if (!campaign) return true;
    return false;
  }, [campaign]);

  // Aggregate all analytics data
  const data = useMemo(() => {
    return {
      sumPrimitives: sumPrimitivesQuery,
      timeseriesPrimitives: timeseriesPrimitivesQuery,
      audienceBreakdown: audienceBreakdownQuery,
      conversionsBreakdown: conversionsBreakdownQuery,
      realtimeOverview: realtimeOverviewQuery,
      landingPages: landingPagesQuery,
    };
  }, [
    sumPrimitivesQuery,
    timeseriesPrimitivesQuery,
    audienceBreakdownQuery,
    conversionsBreakdownQuery,
    realtimeOverviewQuery,
    landingPagesQuery,
  ]);

  console.log("Data:", data);

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
    setScreen,

    // Analytics data
    data,

    // Status flags
    isLoading,
    canShowAnalytics: shouldFetchAnalytics,

    // Actions
    revalidate,
  };
}
