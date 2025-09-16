import { formatToDateTime64, formatToTinybirdDate } from "@firebuzz/utils";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import {
  getAudienceBreakdown,
  getConversionsBreakdown,
  getRealtimeOverview,
  getSumPrimitives,
  getTimeseriesPrimitives,
} from "../../lib/tinybird";
import { generateHashKey, normalizePeriodForCaching } from "./utils";

// Reusable Schemas
const campaignEnvironmentSchema = v.union(
  v.literal("preview"),
  v.literal("production")
);
const periodStartSchema = v.string();
const periodEndSchema = v.string();
const conversionEventIdSchema = v.string();
const eventIdsSchema = v.optional(v.string());

// Sum Primitives Query Params
const sumPrimitivesParamsSchema = v.object({
  queryId: v.literal("sum-primitives"),
  periodStart: periodStartSchema,
  periodEnd: periodEndSchema,
  conversionEventId: conversionEventIdSchema,
  campaignEnvironment: campaignEnvironmentSchema,
  eventIds: eventIdsSchema,
});

// Timeseries Primitives Query Params
const timeseriesPrimitivesParamsSchema = v.object({
  queryId: v.literal("timeseries-primitives"),
  periodStart: periodStartSchema,
  periodEnd: periodEndSchema,
  conversionEventId: conversionEventIdSchema,
  campaignEnvironment: campaignEnvironmentSchema,
  granularity: v.optional(
    v.union(
      v.literal("minute"),
      v.literal("hour"),
      v.literal("day"),
      v.literal("week")
    )
  ),
  eventIds: eventIdsSchema,
});

// Audience Breakdown Query Params
const audienceBreakdownParamsSchema = v.object({
  queryId: v.literal("audience-breakdown"),
  periodStart: periodStartSchema,
  periodEnd: periodEndSchema,
  campaignEnvironment: campaignEnvironmentSchema,
});

// Conversions Breakdown Query Params
const conversionsBreakdownParamsSchema = v.object({
  queryId: v.literal("conversions-breakdown"),
  periodStart: periodStartSchema,
  periodEnd: periodEndSchema,
  conversionEventId: conversionEventIdSchema,
  campaignEnvironment: campaignEnvironmentSchema,
  eventIds: eventIdsSchema,
});

// Realtime Overview Query Params
const realtimeOverviewParamsSchema = v.object({
  queryId: v.literal("realtime-overview"),
  periodStart: periodStartSchema,
  periodEnd: periodEndSchema,
  conversionEventId: conversionEventIdSchema,
  campaignEnvironment: campaignEnvironmentSchema,
});

// Union of all query params
const queryParamsSchema = v.union(
  sumPrimitivesParamsSchema,
  timeseriesPrimitivesParamsSchema,
  audienceBreakdownParamsSchema,
  conversionsBreakdownParamsSchema,
  realtimeOverviewParamsSchema
);

export const fetchAnalyticsPipe = internalAction({
  args: {
    campaignId: v.id("campaigns"),
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    existingAnalyticsPipeId: v.optional(v.id("analyticsPipes")),
    params: queryParamsSchema,
  },
  handler: async (ctx, args) => {
    try {
      const lastUpdatedAt = formatToDateTime64();
      const { campaignId, workspaceId, projectId, params } = args;

      // Create normalized parameters for cache key generation (separate from query parameters)
      const normalizedParams = { ...params };
      if ("periodStart" in params && "periodEnd" in params) {
        const { normalizedPeriodStart, normalizedPeriodEnd } =
          normalizePeriodForCaching(params.periodStart, params.periodEnd);
        normalizedParams.periodStart = normalizedPeriodStart;
        normalizedParams.periodEnd = normalizedPeriodEnd;
      }

      // Generate hash key using normalized parameters for cache efficiency
      const key = generateHashKey(
        JSON.stringify(normalizedParams, Object.keys(normalizedParams).sort())
      );

      type SumPrimitivesData = {
        current_new_sessions: number;
        current_returning_sessions: number;
        current_all_sessions: number;
        current_users: number;
        current_pageviews: number;
        current_conversions: number;
        current_conversion_value: number;
        current_external_link_clicks: number;
        current_form_submissions: number;
        current_avg_session_duration: number;
        current_bounced_sessions: number;
        previous_new_sessions: number;
        previous_returning_sessions: number;
        previous_all_sessions: number;
        previous_users: number;
        previous_pageviews: number;
        previous_conversions: number;
        previous_conversion_value: number;
        previous_external_link_clicks: number;
        previous_form_submissions: number;
        previous_avg_session_duration: number;
        previous_bounced_sessions: number;
        current_custom_events: Array<[string, number, number]>;
        previous_custom_events: Array<[string, number, number]>;
      };

      type TimeseriesData = Array<{
        bucket_start: string;
        bucket_end: string;
        bucket_label: string;
        new_sessions: number;
        returning_sessions: number;
        all_sessions: number;
        users: number;
        pageviews: number;
        conversions: number;
        conversion_value_usd: number;
        external_link_clicks: number;
        form_submissions: number;
        avg_session_duration: number;
        bounced_sessions: number;
        total_sessions_with_duration: number;
        custom_events: Array<[string, number, number]>;
      }>;

      type AudienceBreakdownData = {
        total_sessions: number;
        total_users: number;
        device_types: Array<[string, number, number, number, number, number]>;
        operating_systems: Array<
          [string, number, number, number, number, number]
        >;
        browsers: Array<[string, number, number, number, number, number]>;
        countries: Array<[string, number, number, number, number, number]>;
        cities: Array<[string, string, number, number, number, number, number]>;
        utm_sources: Array<[string, number, number, number, number, number]>;
        sources: Array<[string, number, number, number, number, number]>;
        utm_mediums: Array<[string, number, number, number, number, number]>;
        utm_campaigns: Array<[string, number, number, number, number, number]>;
        referrers: Array<[string, number, number, number, number, number]>;
        user_types: Array<[string, number, number, number]>;
        hourly_distribution: Array<
          [number, number, number, number, number, number]
        >;
        daily_distribution: Array<
          [number, string, number, number, number, number, number]
        >;
        landing_pages: Array<[string, number, number, number, number, number]>;
        ab_test_variants: Array<
          [string, number, number, number, number, number]
        >;
      };

      type ConversionsBreakdownData = {
        total_sessions: number;
        total_users: number;
        total_conversions: number;
        total_conversion_value: number;
        overall_conversion_rate: number;
        device_conversions: Array<
          [string, number, number, number, number, number, number, number]
        >;
        operating_system_conversions: Array<
          [string, number, number, number, number, number, number, number]
        >;
        browser_conversions: Array<
          [string, number, number, number, number, number, number, number]
        >;
        geographic_conversions: Array<
          [string, number, number, number, number, number, number, number]
        >;
        city_conversions: Array<
          [
            string,
            string,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
          ]
        >;
        utm_source_conversions: Array<
          [string, number, number, number, number, number, number, number]
        >;
        utm_medium_conversions: Array<
          [string, number, number, number, number, number, number, number]
        >;
        utm_campaign_conversions: Array<
          [string, number, number, number, number, number, number, number]
        >;
        landing_page_conversions: Array<
          [string, number, number, number, number, number, number, number]
        >;
        hourly_conversions: Array<[number, number, number, number, number]>;
        daily_conversions: Array<
          [number, string, number, number, number, number]
        >;
        user_type_conversions: Array<
          [string, number, number, number, number, number]
        >;
        value_distribution: Array<[string, number, number, number, number]>;
        ab_test_conversions: Array<
          [string, number, number, number, number, number, number, number]
        >;
      };

      type RealtimeOverviewData = {
        active_sessions: number;
        events: number;
        conversions: number;
        conversion_value: number;
        countries: Array<[string, number]>; // [country, session_count]
        devices: Array<[string, number]>; // [device_type, session_count]
        top_landing_pages: Array<[string, number]>; // [landing_page_id, session_count]
        traffic_sources: Array<[string, number]>; // [source, session_count]
        top_events: Array<[string, number]>; // [event_id, event_count]
      };

      let data:
        | SumPrimitivesData
        | TimeseriesData
        | AudienceBreakdownData
        | ConversionsBreakdownData
        | RealtimeOverviewData;

      if (params.queryId === "sum-primitives") {
        const response = await getSumPrimitives({
          workspaceId,
          projectId,
          campaignId,
          periodStart: formatToTinybirdDate(params.periodStart),
          periodEnd: formatToTinybirdDate(params.periodEnd),
          conversionEventId: params.conversionEventId,
          environment: (process.env.ENVIRONMENT || "dev") as
            | "dev"
            | "production"
            | "preview",
          campaignEnvironment: params.campaignEnvironment,
          eventIds: params.eventIds || "",
        });

        // Handle single row response from sum primitives
        const singleData = response.data[0];
        if (!singleData) {
          throw new Error("No data returned from sum primitives");
        }
        data = singleData;
      } else if (params.queryId === "timeseries-primitives") {
        const response = await getTimeseriesPrimitives({
          workspaceId,
          projectId,
          campaignId,
          periodStart: formatToTinybirdDate(params.periodStart),
          periodEnd: formatToTinybirdDate(params.periodEnd),
          conversionEventId: params.conversionEventId,
          environment: (process.env.ENVIRONMENT || "dev") as
            | "dev"
            | "production"
            | "preview",
          campaignEnvironment: params.campaignEnvironment,
          granularity:
            "granularity" in params ? params.granularity || "hour" : "hour",
          eventIds: params.eventIds || "",
        });

        // Handle array response from timeseries primitives
        const arrayData = response.data;
        if (!arrayData || arrayData.length === 0) {
          throw new Error("No data returned from timeseries primitives");
        }
        data = arrayData;
      } else if (params.queryId === "audience-breakdown") {
        const response = await getAudienceBreakdown({
          workspaceId,
          projectId,
          campaignId,
          periodStart: formatToTinybirdDate(params.periodStart),
          periodEnd: formatToTinybirdDate(params.periodEnd),
          environment: (process.env.ENVIRONMENT || "dev") as
            | "dev"
            | "production"
            | "preview",
          campaignEnvironment: params.campaignEnvironment,
        });

        // Handle single row response from audience breakdown
        const singleData = response.data[0];
        if (!singleData) {
          throw new Error("No data returned from audience breakdown");
        }
        data = singleData;
      } else if (params.queryId === "conversions-breakdown") {
        console.log("Conversion event ID:", params.conversionEventId);
        const response = await getConversionsBreakdown({
          workspaceId,
          projectId,
          campaignId,
          periodStart: formatToTinybirdDate(params.periodStart),
          periodEnd: formatToTinybirdDate(params.periodEnd),
          conversionEventId: params.conversionEventId,
          environment: (process.env.ENVIRONMENT || "dev") as
            | "dev"
            | "production"
            | "preview",
          campaignEnvironment: params.campaignEnvironment,
          eventIds: params.eventIds || "",
        });

        // Handle single row response from conversions breakdown
        const singleData = response.data[0];
        if (!singleData) {
          throw new Error("No data returned from conversions breakdown");
        }
        data = singleData;
      } else if (params.queryId === "realtime-overview") {
        // Calculate lookback minutes from periodStart and periodEnd
        const periodStartTime = new Date(params.periodStart).getTime();
        const periodEndTime = new Date(params.periodEnd).getTime();
        const lookbackMinutes = Math.round(
          (periodEndTime - periodStartTime) / (1000 * 60)
        );

        const response = await getRealtimeOverview({
          workspaceId,
          projectId,
          campaignId,
          environment: (process.env.ENVIRONMENT || "dev") as
            | "dev"
            | "production"
            | "preview",
          campaignEnvironment: params.campaignEnvironment,
          conversionEventId: params.conversionEventId,
          lookbackMinutes: Math.max(1, lookbackMinutes), // Ensure at least 1 minute
        });

        // Handle single row response from realtime overview
        const singleData = response.data[0];
        if (!singleData) {
          throw new Error("No data returned from realtime overview");
        }
        data = singleData as unknown as RealtimeOverviewData;
      } else {
        // This should never happen due to TypeScript exhaustiveness checking
        throw new Error("Unknown query type");
      }

      if (args.existingAnalyticsPipeId) {
        await ctx.runMutation(
          internal.collections.analytics.mutations.updateAnalyticsPipe,
          {
            id: args.existingAnalyticsPipeId,
            key,
            lastUpdatedAt,
            payload: data,
          }
        );
      } else {
        await ctx.runMutation(
          internal.collections.analytics.mutations.createAnalyticsPipe,
          {
            queryId: params.queryId,
            campaignId,
            workspaceId,
            projectId,
            key,
            lastUpdatedAt,
            payload: data,
            source: "firebuzz" as const, // Since this is Tinybird query it's always firebuzz
          }
        );
      }

      return { success: true, queryId: params.queryId };
    } catch (error) {
      console.error(`Error fetching ${args.params.queryId} pipe`, error);
      throw error;
    }
  },
});
