import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalMutation, mutation } from "../../_generated/server";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";

// Internal mutations for CRUD operations
export const createAnalyticsPipe = internalMutation({
	args: {
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
		period: v.union(
			v.literal("7d"),
			v.literal("15d"),
			v.literal("30d"),
			v.literal("all-time"),
		),
		campaignEnvironment: v.union(v.literal("preview"), v.literal("production")),
		conversionEventId: v.optional(v.string()),
		eventIds: v.optional(v.string()),
		key: v.string(),
		lastUpdatedAt: v.string(),
		payload: v.any(),
		source: v.union(
			v.literal("firebuzz"),
			v.literal("facebook"),
			v.literal("google"),
			v.literal("twitter"),
			v.literal("linkedin"),
		),
	},
	handler: async (ctx, args) => {
		// Check if record already exists to prevent duplicates
		const existing = await ctx.db
			.query("analyticsPipes")
			.withIndex("by_campaign_query_params", (q) =>
				q
					.eq("campaignId", args.campaignId)
					.eq("queryId", args.queryId)
					.eq("period", args.period)
					.eq("campaignEnvironment", args.campaignEnvironment),
			)
			.first();

		if (existing) {
			// Update existing record instead of creating duplicate
			await ctx.db.patch(existing._id, {
				key: args.key,
				lastUpdatedAt: args.lastUpdatedAt,
				payload: args.payload,
				conversionEventId: args.conversionEventId,
				eventIds: args.eventIds,
				isRefreshing: false,
			});
			return existing._id;
		}

		return await ctx.db.insert("analyticsPipes", args);
	},
});

export const updateAnalyticsPipe = internalMutation({
	args: {
		id: v.id("analyticsPipes"),
		key: v.string(),
		lastUpdatedAt: v.string(),
		payload: v.any(),
	},
	handler: async (ctx, args) => {
		const { id, key, lastUpdatedAt, payload } = args;
		await ctx.db.patch(id, {
			key,
			lastUpdatedAt,
			payload,
			isRefreshing: false,
		});
		return id;
	},
});

// Public mutation for revalidating analytics data
export const revalidateAnalytics = mutation({
	args: {
		campaignId: v.id("campaigns"),
		queries: v.array(
			v.union(
				v.object({
					queryId: v.literal("sum-primitives"),
					period: v.union(
						v.literal("7d"),
						v.literal("15d"),
						v.literal("30d"),
						v.literal("all-time"),
					),
					periodStart: v.string(),
					periodEnd: v.string(),
					conversionEventId: v.string(),
					campaignEnvironment: v.union(
						v.literal("preview"),
						v.literal("production"),
					),
					eventIds: v.optional(v.string()),
				}),
				v.object({
					queryId: v.literal("timeseries-primitives"),
					period: v.union(
						v.literal("7d"),
						v.literal("15d"),
						v.literal("30d"),
						v.literal("all-time"),
					),
					periodStart: v.string(),
					periodEnd: v.string(),
					conversionEventId: v.string(),
					campaignEnvironment: v.union(
						v.literal("preview"),
						v.literal("production"),
					),
					granularity: v.optional(
						v.union(
							v.literal("minute"),
							v.literal("hour"),
							v.literal("day"),
							v.literal("week"),
						),
					),
					eventIds: v.optional(v.string()),
				}),
				v.object({
					queryId: v.literal("audience-breakdown"),
					period: v.union(
						v.literal("7d"),
						v.literal("15d"),
						v.literal("30d"),
						v.literal("all-time"),
					),
					periodStart: v.string(),
					periodEnd: v.string(),
					campaignEnvironment: v.union(
						v.literal("preview"),
						v.literal("production"),
					),
				}),
				v.object({
					queryId: v.literal("conversions-breakdown"),
					period: v.union(
						v.literal("7d"),
						v.literal("15d"),
						v.literal("30d"),
						v.literal("all-time"),
					),
					periodStart: v.string(),
					periodEnd: v.string(),
					conversionEventId: v.string(),
					campaignEnvironment: v.union(
						v.literal("preview"),
						v.literal("production"),
					),
					eventIds: v.optional(v.string()),
				}),
				v.object({
					queryId: v.literal("realtime-overview"),
					period: v.union(
						v.literal("7d"),
						v.literal("15d"),
						v.literal("30d"),
						v.literal("all-time"),
					),
					periodStart: v.string(),
					periodEnd: v.string(),
					conversionEventId: v.string(),
					campaignEnvironment: v.union(
						v.literal("preview"),
						v.literal("production"),
					),
				}),
			),
		),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Verify campaign exists and user has access
		const campaign = await ctx.db.get(args.campaignId);
		if (!campaign) {
			throw new ConvexError("Campaign not found");
		}

		if (campaign.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const results: Array<{
			query: string;
			scheduled: boolean;
			error?: string;
		}> = [];

		// Schedule actions for each query type
		for (const queryParams of args.queries) {
			try {
				// Get the existing analytics pipe using compound index
				const existingAnalyticsPipe = await ctx.db
					.query("analyticsPipes")
					.withIndex("by_campaign_query_params", (q) =>
						q
							.eq("campaignId", args.campaignId)
							.eq("queryId", queryParams.queryId)
							.eq("period", queryParams.period)
							.eq("campaignEnvironment", queryParams.campaignEnvironment),
					)
					.first();

				if (existingAnalyticsPipe) {
					// Check last updated at with different TTL based on query type
					const lastUpdatedAt = new Date(
						existingAnalyticsPipe.lastUpdatedAt,
					).getTime();

					// Use shorter cache TTL for realtime queries
					const cacheTTL =
						queryParams.queryId === "realtime-overview"
							? 15000 // 15 seconds for realtime data
							: 180000; // 3 minutes for other analytics

					const cacheExpiryTime = new Date(Date.now() - cacheTTL).getTime();

					if (lastUpdatedAt > cacheExpiryTime) {
						const ttlDescription =
							queryParams.queryId === "realtime-overview"
								? "15 seconds"
								: "3 minutes";
						console.log(`Last updated at is less than ${ttlDescription} ago`);
						results.push({
							query: queryParams.queryId,
							scheduled: false,
							error: `Last updated at is less than ${ttlDescription} ago`,
						});
						continue;
					}

					await ctx.db.patch(existingAnalyticsPipe._id, { isRefreshing: true });
				}

				// Check Rate Limit
				const { ok, retryAfter } = await ctx.runQuery(
					internal.components.ratelimits.checkLimit,
					{
						name: "analyticsQuery",
					},
				);

				await ctx.scheduler.runAfter(
					ok ? 0 : retryAfter,
					internal.collections.analytics.actions.fetchAnalyticsPipe,
					{
						campaignId: args.campaignId,
						workspaceId: campaign.workspaceId,
						projectId: campaign.projectId,
						existingAnalyticsPipeId: existingAnalyticsPipe?._id,
						params: queryParams,
					},
				);

				results.push({
					query: queryParams.queryId,
					scheduled: true,
				});
			} catch (error) {
				console.error(`Error scheduling ${queryParams.queryId}:`, error);
				results.push({
					query: queryParams.queryId,
					scheduled: false,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		return { results };
	},
});
