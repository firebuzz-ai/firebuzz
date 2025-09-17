import { Tinybird } from "@chronark/zod-bird";
import { formatToDateTime64 } from "@firebuzz/utils";
import { zid, zodToConvex } from "convex-helpers/server/zod";
import { v } from "convex/values";
import { z } from "zod";
import { internalAction } from "../_generated/server";

const token = process.env.TINYBIRD_TOKEN;
const baseUrl = process.env.TINYBIRD_BASE_URL;

if (!token || !baseUrl) {
	throw new Error("TINYBIRD_TOKEN or TINYBIRD_BASE_URL is not set");
}

const tinybird = new Tinybird({
	baseUrl,
	token,
});

// Credit Usage Schema based on credit_usage_v1.datasource
const creditUsageSchema = z.object({
	amount: z.number(),
	type: z.string(),
	idempotencyKey: z.string(),
	createdAt: z.string().datetime(),
	workspaceId: zid("workspaces"),
	userId: zid("users"),
	projectId: zid("projects"),
});

// Build ingest endpoint for credit usage
export const ingestCreditUsage = tinybird.buildIngestEndpoint({
	datasource: "credit_usage_v1",
	event: creditUsageSchema,
});

export const ingestCreditUsageAction = internalAction({
	args: {
		amount: v.number(),
		type: v.string(),
		idempotencyKey: v.string(),
		workspaceId: v.id("workspaces"),
		userId: v.id("users"),
		projectId: v.id("projects"),
	},
	handler: async (_ctx, args) => {
		try {
			const createdAt = formatToDateTime64();

			await ingestCreditUsage({
				...args,
				createdAt,
			});
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
});

// Analytics Pipe Schemas
const overviewAnalyticsParamsSchema = z.object({
	workspaceId: z.string(),
	projectId: z.string(),
	campaignId: z.string(),
	periodStart: z.string(), // DateTime64 format: YYYY-MM-DD HH:MM:SS.MMM
	periodEnd: z.string(), // DateTime64 format: YYYY-MM-DD HH:MM:SS.MMM
	conversionEventId: z.string(),
	environment: z.union([
		z.literal("dev"),
		z.literal("production"),
		z.literal("preview"),
	]),
	campaignEnvironment: z.union([z.literal("preview"), z.literal("production")]),
});

const overviewAnalyticsResponseSchema = z.object({
	sessions: z.number(),
	pageviews: z.number(),
	conversions: z.number(),
	ctr: z.number(),
	series_ts: z.array(z.string()),
	series_sessions: z.array(z.number()),
	series_conversions: z.array(z.number()),
});

const realtimeOverviewParamsSchema = z.object({
	workspaceId: z.string(),
	projectId: z.string(),
	campaignId: z.string(),
	environment: z.union([
		z.literal("dev"),
		z.literal("production"),
		z.literal("preview"),
	]),
	campaignEnvironment: z.union([z.literal("preview"), z.literal("production")]),
	conversionEventId: z.string(),
	lookbackMinutes: z.number().optional(),
});

const realtimeOverviewResponseSchema = z.object({
	active_sessions: z.number(),
	events: z.number(),
	conversions: z.number(),
	conversion_value: z.number(),
	countries: z.array(z.tuple([z.string(), z.number()])), // [country, session_count]
	devices: z.array(z.tuple([z.string(), z.number()])), // [device_type, session_count]
	top_landing_pages: z.array(z.tuple([z.string(), z.number()])), // [landing_page_id, session_count]
	traffic_sources: z.array(z.tuple([z.string(), z.number()])), // [source, session_count]
	top_events: z.array(z.tuple([z.string(), z.number()])), // [event_id, event_count]
});

const abTestResultsParamsSchema = z.object({
	workspaceId: z.string(),
	projectId: z.string(),
	campaignId: z.string(),
	periodStart: z.string(), // DateTime64 format: YYYY-MM-DD HH:MM:SS.MMM
	periodEnd: z.string(), // DateTime64 format: YYYY-MM-DD HH:MM:SS.MMM
	environment: z.union([
		z.literal("dev"),
		z.literal("production"),
		z.literal("preview"),
	]),
	campaignEnvironment: z.union([z.literal("preview"), z.literal("production")]),
	abTestsPairs: z.string(),
});

const abTestResultsResponseSchema = z.object({
	ab_test_id: z.string(),
	ab_test_variant_id: z.string(),
	exposures: z.number(),
	conversions: z.number(),
	value: z.number(),
	cvr: z.number(),
	cvr_ci_low: z.number(),
	cvr_ci_high: z.number(),
});

const sumPrimitivesParamsSchema = z.object({
	workspaceId: z.string(),
	projectId: z.string(),
	campaignId: z.string(),
	periodStart: z.string(), // DateTime64 format: YYYY-MM-DD HH:MM:SS.MMM
	periodEnd: z.string(), // DateTime64 format: YYYY-MM-DD HH:MM:SS.MMM
	conversionEventId: z.string(),
	environment: z.union([
		z.literal("dev"),
		z.literal("production"),
		z.literal("preview"),
	]),
	campaignEnvironment: z.union([z.literal("preview"), z.literal("production")]),
	eventIds: z.string().optional().default(""), // Comma-separated event IDs
});

const sumPrimitivesResponseSchema = z.object({
	// Current period metrics
	current_new_sessions: z.number(),
	current_returning_sessions: z.number(),
	current_all_sessions: z.number(),
	current_users: z.number(),
	current_pageviews: z.number(),
	current_conversions: z.number(),
	current_conversion_value: z.number(),
	current_external_link_clicks: z.number(),
	current_form_submissions: z.number(),
	current_avg_session_duration: z.number(),
	current_bounced_sessions: z.number(),

	// Previous period metrics
	previous_new_sessions: z.number(),
	previous_returning_sessions: z.number(),
	previous_all_sessions: z.number(),
	previous_users: z.number(),
	previous_pageviews: z.number(),
	previous_conversions: z.number(),
	previous_conversion_value: z.number(),
	previous_external_link_clicks: z.number(),
	previous_form_submissions: z.number(),
	previous_avg_session_duration: z.number(),
	previous_bounced_sessions: z.number(),

	// Custom events (array of tuples: [event_id, count, value_sum])
	current_custom_events: z.array(z.tuple([z.string(), z.number(), z.number()])),
	previous_custom_events: z.array(
		z.tuple([z.string(), z.number(), z.number()]),
	),
});

const timeseriesPrimitivesParamsSchema = z.object({
	workspaceId: z.string(),
	projectId: z.string(),
	campaignId: z.string(),
	periodStart: z.string(), // DateTime64 format: YYYY-MM-DD HH:MM:SS.MMM
	periodEnd: z.string(), // DateTime64 format: YYYY-MM-DD HH:MM:SS.MMM
	conversionEventId: z.string(),
	environment: z.union([
		z.literal("dev"),
		z.literal("production"),
		z.literal("preview"),
	]),
	campaignEnvironment: z.union([z.literal("preview"), z.literal("production")]),
	granularity: z
		.union([
			z.literal("minute"),
			z.literal("hour"),
			z.literal("day"),
			z.literal("week"),
		])
		.optional()
		.default("hour"),
	eventIds: z.string().optional().default(""), // Comma-separated event IDs
});

const timeseriesPrimitivesResponseSchema = z.object({
	bucket_start: z.string(), // DateTime64 format
	bucket_end: z.string(), // DateTime64 format
	bucket_label: z.string(), // Human readable time label

	// Session metrics
	new_sessions: z.number(),
	returning_sessions: z.number(),
	all_sessions: z.number(),
	users: z.number(),

	// Event metrics
	pageviews: z.number(),
	conversions: z.number(),
	conversion_value_usd: z.number(),
	external_link_clicks: z.number(),
	form_submissions: z.number(),

	// Duration metrics
	avg_session_duration: z.number(),
	bounced_sessions: z.number(),
	total_sessions_with_duration: z.number(),

	// Custom events (array of tuples: [event_id, count, value_sum])
	custom_events: z.array(z.tuple([z.string(), z.number(), z.number()])),
});

const audienceBreakdownParamsSchema = z.object({
	workspaceId: z.string(),
	projectId: z.string(),
	campaignId: z.string(),
	periodStart: z.string(), // DateTime64 format: YYYY-MM-DD HH:MM:SS.MMM
	periodEnd: z.string(), // DateTime64 format: YYYY-MM-DD HH:MM:SS.MMM
	environment: z.union([
		z.literal("dev"),
		z.literal("production"),
		z.literal("preview"),
	]),
	campaignEnvironment: z.union([z.literal("preview"), z.literal("production")]),
});

// Audience segment schema - represents each breakdown segment
const audienceSegmentSchema = z.tuple([
	z.string(), // segment name (e.g. "Desktop", "US")
	z.number(), // sessions
	z.number(), // users
	z.number(), // new_sessions
	z.number(), // returning_sessions
	z.number(), // percentage
]);

const audienceBreakdownResponseSchema = z.object({
	total_sessions: z.number(),
	total_users: z.number(),
	device_types: z.array(audienceSegmentSchema),
	operating_systems: z.array(audienceSegmentSchema),
	browsers: z.array(audienceSegmentSchema),
	countries: z.array(audienceSegmentSchema),
	cities: z.array(
		z.tuple([
			z.string(), // city
			z.string(), // country
			z.number(), // sessions
			z.number(), // users
			z.number(), // new_sessions
			z.number(), // returning_sessions
			z.number(), // percentage
		]),
	),
	continents: z.array(audienceSegmentSchema),
	languages: z.array(audienceSegmentSchema),
	timezones: z.array(audienceSegmentSchema),
	utm_sources: z.array(audienceSegmentSchema),
	sources: z.array(audienceSegmentSchema),
	utm_mediums: z.array(audienceSegmentSchema),
	utm_campaigns: z.array(audienceSegmentSchema),
	referrers: z.array(audienceSegmentSchema),
	user_types: z.array(
		z.tuple([
			z.string(), // user_type
			z.number(), // sessions
			z.number(), // users
			z.number(), // percentage
		]),
	),
	hourly_distribution: z.array(
		z.tuple([
			z.number(), // hour
			z.number(), // sessions
			z.number(), // users
			z.number(), // new_sessions
			z.number(), // returning_sessions
			z.number(), // percentage
		]),
	),
	daily_distribution: z.array(
		z.tuple([
			z.number(), // day_of_week
			z.string(), // day_name
			z.number(), // sessions
			z.number(), // users
			z.number(), // new_sessions
			z.number(), // returning_sessions
			z.number(), // percentage
		]),
	),
	landing_pages: z.array(audienceSegmentSchema),
	ab_test_variants: z.array(audienceSegmentSchema),
});

const conversionsBreakdownParamsSchema = z.object({
	workspaceId: z.string(),
	projectId: z.string(),
	campaignId: z.string(),
	periodStart: z.string(), // DateTime64 format: YYYY-MM-DD HH:MM:SS.MMM
	periodEnd: z.string(), // DateTime64 format: YYYY-MM-DD HH:MM:SS.MMM
	conversionEventId: z.string(),
	environment: z.union([
		z.literal("dev"),
		z.literal("production"),
		z.literal("preview"),
	]),
	campaignEnvironment: z.union([z.literal("preview"), z.literal("production")]),
	eventIds: z.string().optional().default(""), // Comma-separated event IDs
});

// Conversion segment schema - represents each conversion breakdown segment
const conversionSegmentSchema = z.tuple([
	z.string(), // segment name (e.g. "Desktop", "US")
	z.number(), // sessions
	z.number(), // users
	z.number(), // conversions
	z.number(), // conversion_value_usd
	z.number(), // conversion_rate
	z.number(), // new_user_conversions
	z.number(), // returning_user_conversions
]);

const conversionsBreakdownResponseSchema = z.object({
	total_sessions: z.number(),
	total_users: z.number(),
	total_conversions: z.number(),
	total_conversion_value: z.number(),
	overall_conversion_rate: z.number(),
	device_conversions: z.array(conversionSegmentSchema),
	operating_system_conversions: z.array(conversionSegmentSchema),
	browser_conversions: z.array(conversionSegmentSchema),
	geographic_conversions: z.array(conversionSegmentSchema),
	city_conversions: z.array(
		z.tuple([
			z.string(), // city
			z.string(), // country
			z.number(), // sessions
			z.number(), // users
			z.number(), // conversions
			z.number(), // conversion_value_usd
			z.number(), // conversion_rate
			z.number(), // new_user_conversions
			z.number(), // returning_user_conversions
		]),
	),
	utm_source_conversions: z.array(conversionSegmentSchema),
	utm_medium_conversions: z.array(conversionSegmentSchema),
	utm_campaign_conversions: z.array(conversionSegmentSchema),
	referrer_conversions: z.array(conversionSegmentSchema),
	source_conversions: z.array(conversionSegmentSchema),
	landing_page_conversions: z.array(conversionSegmentSchema),
	hourly_conversions: z.array(
		z.tuple([
			z.number(), // hour
			z.number(), // conversions
			z.number(), // converting_users
			z.number(), // conversion_value_usd
			z
				.number()
				.nullable()
				.transform((val) => val ?? 0), // avg_conversion_value
		]),
	),
	daily_conversions: z.array(
		z.tuple([
			z.number(), // day_of_week
			z
				.string()
				.nullable()
				.transform((val) => val ?? ""), // day_name
			z.number(), // conversions
			z.number(), // converting_users
			z.number(), // conversion_value_usd
			z
				.number()
				.nullable()
				.transform((val) => val ?? 0), // avg_conversion_value
		]),
	),
	user_type_conversions: z.array(
		z.tuple([
			z.string(), // user_type
			z.number(), // sessions
			z.number(), // users
			z.number(), // conversions
			z.number(), // conversion_value_usd
			z.number(), // conversion_rate
		]),
	),
	value_distribution: z.array(
		z.tuple([
			z.string(), // value_range
			z.number(), // conversions
			z.number(), // converting_users
			z.number(), // total_value
			z.number(), // avg_value
		]),
	),
	ab_test_conversions: z.array(conversionSegmentSchema),
});

// Build Analytics Pipe Endpoints
export const getOverviewAnalytics = tinybird.buildPipe({
	pipe: "overview_analytics",
	parameters: overviewAnalyticsParamsSchema,
	data: overviewAnalyticsResponseSchema,
});

export const getRealtimeOverview = tinybird.buildPipe({
	pipe: "realtime_overview",
	parameters: realtimeOverviewParamsSchema,
	data: realtimeOverviewResponseSchema,
});

export const getABTestResults = tinybird.buildPipe({
	pipe: "abtest_results",
	parameters: abTestResultsParamsSchema,
	data: abTestResultsResponseSchema,
});

export const getSumPrimitives = tinybird.buildPipe({
	pipe: "sum_primitives",
	parameters: sumPrimitivesParamsSchema,
	data: sumPrimitivesResponseSchema,
});

export const getTimeseriesPrimitives = tinybird.buildPipe({
	pipe: "timeseries_primitives",
	parameters: timeseriesPrimitivesParamsSchema,
	data: timeseriesPrimitivesResponseSchema,
});

export const getAudienceBreakdown = tinybird.buildPipe({
	pipe: "audience_breakdown",
	parameters: audienceBreakdownParamsSchema,
	data: audienceBreakdownResponseSchema,
});

export const getConversionsBreakdown = tinybird.buildPipe({
	pipe: "conversions_breakdown",
	parameters: conversionsBreakdownParamsSchema,
	data: conversionsBreakdownResponseSchema,
});

// Convert Zod schemas to Convex validators for use in actions
export const overviewAnalyticsParamsConvex = zodToConvex(
	overviewAnalyticsParamsSchema,
);
export const realtimeOverviewParamsConvex = zodToConvex(
	realtimeOverviewParamsSchema,
);
export const abTestResultsParamsConvex = zodToConvex(abTestResultsParamsSchema);
export const sumPrimitivesParamsConvex = zodToConvex(sumPrimitivesParamsSchema);
export const timeseriesPrimitivesParamsConvex = zodToConvex(
	timeseriesPrimitivesParamsSchema,
);
export const audienceBreakdownParamsConvex = zodToConvex(
	audienceBreakdownParamsSchema,
);
export const conversionsBreakdownParamsConvex = zodToConvex(
	conversionsBreakdownParamsSchema,
);
