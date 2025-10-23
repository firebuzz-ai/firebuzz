import { formatToDateTime64, formatToTinybirdDate } from "@firebuzz/utils";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import {
	type AbTestResultData,
	type AudienceBreakdownData,
	type ConversionsBreakdownData,
	getAbTestResult,
	getAudienceBreakdown,
	getConversionsBreakdown,
	getRealtimeOverview,
	getSumPrimitives,
	getTimeseriesPrimitives,
	type RealtimeOverviewData,
	type SumPrimitivesData,
	type TimeseriesData,
} from "../../lib/tinybird";
import {
	generateStructuredKey,
	generateStructuredKeyForAbTestResult,
} from "./utils";

// Reusable Schemas
const campaignEnvironmentSchema = v.union(
	v.literal("preview"),
	v.literal("production"),
);
const periodSchema = v.union(
	v.literal("7d"),
	v.literal("15d"),
	v.literal("30d"),
	v.literal("all-time"),
);
const periodStartSchema = v.string();
const periodEndSchema = v.string();
const conversionEventIdSchema = v.string();
const eventIdsSchema = v.optional(v.string());

// Sum Primitives Query Params
const sumPrimitivesParamsSchema = v.object({
	queryId: v.literal("sum-primitives"),
	period: periodSchema,
	periodStart: periodStartSchema,
	periodEnd: periodEndSchema,
	conversionEventId: conversionEventIdSchema,
	campaignEnvironment: campaignEnvironmentSchema,
	eventIds: eventIdsSchema,
});

// Timeseries Primitives Query Params
const timeseriesPrimitivesParamsSchema = v.object({
	queryId: v.literal("timeseries-primitives"),
	period: periodSchema,
	periodStart: periodStartSchema,
	periodEnd: periodEndSchema,
	conversionEventId: conversionEventIdSchema,
	campaignEnvironment: campaignEnvironmentSchema,
	granularity: v.optional(
		v.union(
			v.literal("minute"),
			v.literal("hour"),
			v.literal("day"),
			v.literal("week"),
		),
	),
	eventIds: eventIdsSchema,
});

// Audience Breakdown Query Params
const audienceBreakdownParamsSchema = v.object({
	queryId: v.literal("audience-breakdown"),
	period: periodSchema,
	periodStart: periodStartSchema,
	periodEnd: periodEndSchema,
	campaignEnvironment: campaignEnvironmentSchema,
});

// Conversions Breakdown Query Params
const conversionsBreakdownParamsSchema = v.object({
	queryId: v.literal("conversions-breakdown"),
	period: periodSchema,
	periodStart: periodStartSchema,
	periodEnd: periodEndSchema,
	conversionEventId: conversionEventIdSchema,
	campaignEnvironment: campaignEnvironmentSchema,
	eventIds: eventIdsSchema,
});

// Realtime Overview Query Params
const realtimeOverviewParamsSchema = v.object({
	queryId: v.literal("realtime-overview"),
	period: periodSchema,
	periodStart: periodStartSchema,
	periodEnd: periodEndSchema,
	conversionEventId: conversionEventIdSchema,
	campaignEnvironment: campaignEnvironmentSchema,
});

// AB Test Result Query Params
const abTestResultParamsSchema = v.object({
	queryId: v.literal("ab-test-result"),
	abTestId: v.string(),
	conversionEventId: conversionEventIdSchema,
	confidenceLevel: v.union(v.literal(90), v.literal(95), v.literal(99)),
	campaignEnvironment: campaignEnvironmentSchema,
});

// Union of all query params
const queryParamsSchema = v.union(
	sumPrimitivesParamsSchema,
	timeseriesPrimitivesParamsSchema,
	audienceBreakdownParamsSchema,
	conversionsBreakdownParamsSchema,
	realtimeOverviewParamsSchema,
	abTestResultParamsSchema,
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

			// Generate structured key for the analytics record
			let key: string;

			if (params.queryId === "ab-test-result") {
				key = generateStructuredKeyForAbTestResult({
					campaignId,
					queryId: params.queryId,
					abTestId: params.abTestId,
					conversionEventId: params.conversionEventId,
					confidenceLevel: params.confidenceLevel,
					campaignEnvironment: params.campaignEnvironment,
				});
			} else {
				key = generateStructuredKey({
					campaignId,
					queryId: params.queryId,
					period: params.period,
					campaignEnvironment: params.campaignEnvironment,
				});
			}

			let data:
				| SumPrimitivesData
				| TimeseriesData
				| AudienceBreakdownData
				| ConversionsBreakdownData
				| RealtimeOverviewData
				| AbTestResultData;

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
					// Create empty data structure with zero values instead of throwing error
					data = {
						current_all_sessions: 0,
						current_new_sessions: 0,
						current_returning_sessions: 0,
						current_users: 0,
						current_pageviews: 0,
						current_conversions: 0,
						current_conversion_value: 0,
						current_external_link_clicks: 0,
						current_form_submissions: 0,
						current_avg_session_duration: 0,
						current_bounced_sessions: 0,
						previous_all_sessions: 0,
						previous_new_sessions: 0,
						previous_returning_sessions: 0,
						previous_users: 0,
						previous_pageviews: 0,
						previous_conversions: 0,
						previous_conversion_value: 0,
						previous_external_link_clicks: 0,
						previous_form_submissions: 0,
						previous_avg_session_duration: 0,
						previous_bounced_sessions: 0,
					} as SumPrimitivesData;
				} else {
					data = singleData;
				}
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
					// Return empty array instead of throwing error
					data = [] as TimeseriesData;
				} else {
					data = arrayData;
				}
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
					// Create empty data structure instead of throwing error
					data = {
						total_sessions: 0,
						total_users: 0,
						device_types: [],
						operating_systems: [],
						browsers: [],
						countries: [],
						cities: [],
						continents: [],
						languages: [],
						timezones: [],
						utm_sources: [],
						sources: [],
						utm_mediums: [],
						utm_campaigns: [],
						referrers: [],
						user_types: [],
						hourly_distribution: [],
						daily_distribution: [],
						landing_pages: [],
						segments: [],
						ab_test_variants: [],
					} as AudienceBreakdownData;
				} else {
					data = singleData;
				}
			} else if (params.queryId === "conversions-breakdown") {
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
					// Create empty data structure instead of throwing error
					data = {
						total_sessions: 0,
						total_users: 0,
						total_conversions: 0,
						total_conversion_value: 0,
						overall_conversion_rate: 0,
						device_conversions: [],
						operating_system_conversions: [],
						browser_conversions: [],
						geographic_conversions: [],
						city_conversions: [],
						utm_source_conversions: [],
						utm_medium_conversions: [],
						utm_campaign_conversions: [],
						referrer_conversions: [],
						source_conversions: [],
						landing_page_conversions: [],
						hourly_conversions: [],
						daily_conversions: [],
						user_type_conversions: [],
						value_distribution: [],
						segment_conversions: [],
						ab_test_conversions: [],
					} as ConversionsBreakdownData;
				} else {
					data = singleData;
				}
			} else if (params.queryId === "realtime-overview") {
				// Calculate lookback minutes from periodStart and periodEnd
				const periodStartTime = new Date(params.periodStart).getTime();
				const periodEndTime = new Date(params.periodEnd).getTime();
				const lookbackMinutes = Math.round(
					(periodEndTime - periodStartTime) / (1000 * 60),
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
					// Create empty data structure instead of throwing error
					data = {
						active_sessions: 0,
						events: 0,
						conversions: 0,
						conversion_value: 0,
						top_pages: [],
						top_referrers: [],
						top_countries: [],
						top_devices: [],
						recent_conversions: [],
					} as unknown as RealtimeOverviewData;
				} else {
					data = singleData as unknown as RealtimeOverviewData;
				}
			} else if (params.queryId === "ab-test-result") {
				console.log("AB test result data:", {
					workspaceId,
					projectId,
					campaignId,
					environment: (process.env.ENVIRONMENT || "dev") as
						| "dev"
						| "production"
						| "preview",
					campaignEnvironment: params.campaignEnvironment,
					abTestId: params.abTestId,
					conversionEventId: params.conversionEventId,
					confidenceLevel: params.confidenceLevel,
				});
				const response = await getAbTestResult({
					workspaceId,
					projectId,
					campaignId,
					environment: (process.env.ENVIRONMENT || "dev") as
						| "dev"
						| "production"
						| "preview",
					campaignEnvironment: params.campaignEnvironment,
					abTestId: params.abTestId,
					conversionEventId: params.conversionEventId,
					confidenceLevel: params.confidenceLevel,
				});

				// Handle array response from AB test result
				const arrayData = response.data;
				console.log("AB test result data:", arrayData);
				if (!arrayData || arrayData.length === 0) {
					// Return empty array instead of throwing error
					data = [] as AbTestResultData;
				} else {
					data = arrayData;
				}
			} else {
				// This should never happen due to TypeScript exhaustiveness checking
				throw new Error("Unknown query type");
			}

			if (args.existingAnalyticsPipeId) {
				console.log(
					`Updating existing analytics pipe ${args.existingAnalyticsPipeId} for ${params.queryId}`,
				);
				await ctx.runMutation(
					internal.collections.analytics.mutations.updateAnalyticsPipe,
					{
						id: args.existingAnalyticsPipeId,
						key,
						lastUpdatedAt,
						payload: data,
					},
				);
			} else {
				const period =
					"period" in params ? params.period : ("all-time" as const);
				console.log(
					`Creating new analytics pipe for ${params.queryId}, period: ${period}, environment: ${params.campaignEnvironment}`,
				);
				await ctx.runMutation(
					internal.collections.analytics.mutations.createAnalyticsPipe,
					{
						queryId: params.queryId,
						campaignId,
						workspaceId,
						projectId,
						// Use the period from params, not hardcoded "all-time"
						period,
						campaignEnvironment: params.campaignEnvironment,
						conversionEventId:
							"conversionEventId" in params
								? params.conversionEventId
								: undefined,
						eventIds: "eventIds" in params ? params.eventIds : undefined,
						abTestId: "abTestId" in params ? params.abTestId : undefined,
						confidenceLevel:
							"confidenceLevel" in params ? params.confidenceLevel : undefined,
						key,
						lastUpdatedAt,
						payload: data,
						source: "firebuzz" as const, // Since this is Tinybird query it's always firebuzz
					},
				);
			}

			return { success: true, queryId: params.queryId };
		} catch (error) {
			console.error(`Error fetching ${args.params.queryId} pipe`, error);
			throw error;
		}
	},
});
