import { defineTable } from "convex/server";
import { v } from "convex/values";

// Query Schemas
const queryBaseSchema = v.object({
	key: v.string(),
	queryId: v.union(
		v.literal("sum-primitives"),
		v.literal("timeseries-primitives"),
		v.literal("audience-breakdown"),
		v.literal("conversions-breakdown"),
		v.literal("realtime-overview"),
	),
	campaignId: v.id("campaigns"),
	workspaceId: v.id("workspaces"),
	projectId: v.id("projects"),
	lastUpdatedAt: v.string(),
	isRefreshing: v.optional(v.boolean()),
	source: v.union(
		v.literal("firebuzz"),
		v.literal("facebook"),
		v.literal("google"),
		v.literal("twitter"),
		v.literal("linkedin"),
	),
});

export const sumPrimitivesSchema = v.object({
	...queryBaseSchema.fields,
	queryId: v.literal("sum-primitives"),
	payload: v.object({
		// Current period metrics
		current_new_sessions: v.number(),
		current_returning_sessions: v.number(),
		current_all_sessions: v.number(),
		current_users: v.number(),
		current_pageviews: v.number(),
		current_conversions: v.number(),
		current_conversion_value: v.number(),
		current_external_link_clicks: v.number(),
		current_form_submissions: v.number(),
		current_avg_session_duration: v.number(),
		current_bounced_sessions: v.number(),

		// Previous period metrics
		previous_new_sessions: v.number(),
		previous_returning_sessions: v.number(),
		previous_all_sessions: v.number(),
		previous_users: v.number(),
		previous_pageviews: v.number(),
		previous_conversions: v.number(),
		previous_conversion_value: v.number(),
		previous_external_link_clicks: v.number(),
		previous_form_submissions: v.number(),
		previous_avg_session_duration: v.number(),
		previous_bounced_sessions: v.number(),

		// Custom events (array of tuples: [event_id, count, value_sum])
		current_custom_events: v.array(v.array(v.union(v.string(), v.number()))),
		previous_custom_events: v.array(v.array(v.union(v.string(), v.number()))),
	}),
});

export const timeseriesPrimitivesSchema = v.object({
	...queryBaseSchema.fields,
	queryId: v.literal("timeseries-primitives"),
	payload: v.array(
		v.object({
			bucket_start: v.string(), // DateTime64 format
			bucket_end: v.string(), // DateTime64 format
			bucket_label: v.string(), // Human readable time label

			// Session metrics
			new_sessions: v.number(),
			returning_sessions: v.number(),
			all_sessions: v.number(),
			users: v.number(),

			// Event metrics
			pageviews: v.number(),
			conversions: v.number(),
			conversion_value_usd: v.number(),
			external_link_clicks: v.number(),
			form_submissions: v.number(),

			// Duration metrics
			avg_session_duration: v.number(),
			bounced_sessions: v.number(),
			total_sessions_with_duration: v.number(),

			// Custom events (array of tuples: [event_id, count, value_sum])
			custom_events: v.array(v.array(v.union(v.string(), v.number()))),
		}),
	),
});

export const audienceBreakdownSchema = v.object({
	...queryBaseSchema.fields,
	queryId: v.literal("audience-breakdown"),
	payload: v.object({
		total_sessions: v.number(),
		total_users: v.number(),
		// Arrays of tuples for each breakdown dimension
		device_types: v.array(v.array(v.union(v.string(), v.number()))),
		operating_systems: v.array(v.array(v.union(v.string(), v.number()))),
		browsers: v.array(v.array(v.union(v.string(), v.number()))),
		countries: v.array(v.array(v.union(v.string(), v.number()))),
		cities: v.array(v.array(v.union(v.string(), v.number()))),
		utm_sources: v.array(v.array(v.union(v.string(), v.number()))),
		sources: v.array(v.array(v.union(v.string(), v.number()))),
		utm_mediums: v.array(v.array(v.union(v.string(), v.number()))),
		utm_campaigns: v.array(v.array(v.union(v.string(), v.number()))),
		referrers: v.array(v.array(v.union(v.string(), v.number()))),
		user_types: v.array(v.array(v.union(v.string(), v.number()))),
		hourly_distribution: v.array(v.array(v.union(v.string(), v.number()))),
		daily_distribution: v.array(v.array(v.union(v.string(), v.number()))),
		landing_pages: v.array(v.array(v.union(v.string(), v.number()))),
		ab_test_variants: v.array(v.array(v.union(v.string(), v.number()))),
	}),
});

export const conversionsBreakdownSchema = v.object({
	...queryBaseSchema.fields,
	queryId: v.literal("conversions-breakdown"),
	payload: v.object({
		total_sessions: v.number(),
		total_users: v.number(),
		total_conversions: v.number(),
		total_conversion_value: v.number(),
		overall_conversion_rate: v.number(),
		// Arrays of tuples for each breakdown dimension
		device_conversions: v.array(v.array(v.union(v.string(), v.number()))),
		operating_system_conversions: v.array(
			v.array(v.union(v.string(), v.number())),
		),
		browser_conversions: v.array(v.array(v.union(v.string(), v.number()))),
		geographic_conversions: v.array(v.array(v.union(v.string(), v.number()))),
		city_conversions: v.array(v.array(v.union(v.string(), v.number()))),
		utm_source_conversions: v.array(v.array(v.union(v.string(), v.number()))),
		utm_medium_conversions: v.array(v.array(v.union(v.string(), v.number()))),
		utm_campaign_conversions: v.array(v.array(v.union(v.string(), v.number()))),
		landing_page_conversions: v.array(v.array(v.union(v.string(), v.number()))),
		hourly_conversions: v.array(v.array(v.union(v.string(), v.number()))),
		daily_conversions: v.array(v.array(v.union(v.string(), v.number()))),
		user_type_conversions: v.array(v.array(v.union(v.string(), v.number()))),
		value_distribution: v.array(v.array(v.union(v.string(), v.number()))),
		ab_test_conversions: v.array(v.array(v.union(v.string(), v.number()))),
	}),
});

export const realtimeOverviewSchema = v.object({
	...queryBaseSchema.fields,
	queryId: v.literal("realtime-overview"),
	payload: v.object({
		active_sessions: v.number(),
		events: v.number(),
		conversions: v.number(),
		conversion_value: v.number(),
		countries: v.array(v.string()),
		devices: v.array(v.string()),
		top_landing_pages: v.array(v.string()),
		traffic_sources: v.array(v.string()),
		top_events: v.array(v.string()),
	}),
});

export const analyticsPipesSchema = defineTable(
	v.union(
		// Sum Primitives query
		sumPrimitivesSchema,
		// Timeseries Primitives query
		timeseriesPrimitivesSchema,
		// Audience Breakdown query
		audienceBreakdownSchema,
		// Conversions Breakdown query
		conversionsBreakdownSchema,
		// Realtime Overview query
		realtimeOverviewSchema,
	),
)
	.index("by_campaign_query", ["campaignId", "queryId"])
	.index("by_workspace_project", ["workspaceId", "projectId"])
	.index("by_last_updated", ["lastUpdatedAt"]);
