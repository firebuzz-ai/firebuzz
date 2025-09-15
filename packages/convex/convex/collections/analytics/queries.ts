import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { internalQuery, query } from "../../_generated/server";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";

// Internal query to get analytics by campaign and query ID
export const getByQueryId = internalQuery({
	args: {
		campaignId: v.id("campaigns"),
		queryId: v.union(
			v.literal("sum-primitives"),
			v.literal("timeseries-primitives"),
			v.literal("audience-breakdown"),
			v.literal("conversions-breakdown"),
			v.literal("realtime-overview"),
		),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("analyticsPipes")
			.withIndex("by_campaign_query", (q) =>
				q.eq("campaignId", args.campaignId).eq("queryId", args.queryId),
			)
			.first();
	},
});

// Helper function to verify user access to campaign
async function verifyCampaignAccess(
	ctx: QueryCtx,
	campaignId: Id<"campaigns">,
): Promise<Doc<"campaigns">> {
	const user = await getCurrentUserWithWorkspace(ctx);
	if (!user) {
		throw new ConvexError(ERRORS.UNAUTHORIZED);
	}

	const campaign = await ctx.db.get(campaignId);
	if (!campaign) {
		throw new ConvexError("Campaign not found");
	}

	if (campaign.workspaceId !== user.currentWorkspaceId) {
		throw new ConvexError(ERRORS.UNAUTHORIZED);
	}

	return campaign;
}

// Public query for fetching sum primitives analytics data
export const getSumPrimitives = query({
	args: {
		campaignId: v.id("campaigns"),
	},
	handler: async (ctx, args) => {
		await verifyCampaignAccess(ctx, args.campaignId);

		const result = await ctx.db
			.query("analyticsPipes")
			.withIndex("by_campaign_query", (q) =>
				q.eq("campaignId", args.campaignId).eq("queryId", "sum-primitives"),
			)
			.first();

		if (!result) {
			return null;
		}

		// Type assertion since we know this is sum-primitives
		return result as Extract<
			Doc<"analyticsPipes">,
			{ queryId: "sum-primitives" }
		>;
	},
});

// Public query for fetching timeseries primitives analytics data
export const getTimeseriesPrimitives = query({
	args: {
		campaignId: v.id("campaigns"),
	},
	handler: async (ctx, args) => {
		await verifyCampaignAccess(ctx, args.campaignId);

		const result = await ctx.db
			.query("analyticsPipes")
			.withIndex("by_campaign_query", (q) =>
				q
					.eq("campaignId", args.campaignId)
					.eq("queryId", "timeseries-primitives"),
			)
			.first();

		if (!result) {
			return null;
		}

		// Type assertion since we know this is timeseries-primitives
		return result as Extract<
			Doc<"analyticsPipes">,
			{ queryId: "timeseries-primitives" }
		>;
	},
});

// Public query for fetching audience breakdown analytics data
export const getAudienceBreakdown = query({
	args: {
		campaignId: v.id("campaigns"),
	},
	handler: async (ctx, args) => {
		await verifyCampaignAccess(ctx, args.campaignId);

		const result = await ctx.db
			.query("analyticsPipes")
			.withIndex("by_campaign_query", (q) =>
				q.eq("campaignId", args.campaignId).eq("queryId", "audience-breakdown"),
			)
			.first();

		if (!result) {
			return null;
		}

		// Type assertion since we know this is audience-breakdown
		return result as Extract<
			Doc<"analyticsPipes">,
			{ queryId: "audience-breakdown" }
		>;
	},
});

// Public query for fetching conversions breakdown analytics data
export const getConversionsBreakdown = query({
	args: {
		campaignId: v.id("campaigns"),
	},
	handler: async (ctx, args) => {
		await verifyCampaignAccess(ctx, args.campaignId);

		const result = await ctx.db
			.query("analyticsPipes")
			.withIndex("by_campaign_query", (q) =>
				q
					.eq("campaignId", args.campaignId)
					.eq("queryId", "conversions-breakdown"),
			)
			.first();

		if (!result) {
			return null;
		}

		// Type assertion since we know this is conversions-breakdown
		return result as Extract<
			Doc<"analyticsPipes">,
			{ queryId: "conversions-breakdown" }
		>;
	},
});

// Public query for fetching realtime overview analytics data
export const getRealtimeOverview = query({
	args: {
		campaignId: v.id("campaigns"),
	},
	handler: async (ctx, args) => {
		await verifyCampaignAccess(ctx, args.campaignId);

		const result = await ctx.db
			.query("analyticsPipes")
			.withIndex("by_campaign_query", (q) =>
				q.eq("campaignId", args.campaignId).eq("queryId", "realtime-overview"),
			)
			.first();

		if (!result) {
			return null;
		}

		// Type assertion since we know this is realtime-overview
		return result as Extract<
			Doc<"analyticsPipes">,
			{ queryId: "realtime-overview" }
		>;
	},
});

// Query to get analytics data by workspace for admin purposes
export const getByWorkspace = query({
	args: {
		workspaceId: v.id("workspaces"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		if (user.currentWorkspaceId !== args.workspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		return await ctx.db
			.query("analyticsPipes")
			.withIndex("by_workspace_project", (q) =>
				q.eq("workspaceId", args.workspaceId),
			)
			.collect();
	},
});

// Query to get analytics data by project
export const getByProject = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Verify project belongs to user's workspace
		const project = await ctx.db.get(args.projectId);
		if (!project || project.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		return await ctx.db
			.query("analyticsPipes")
			.withIndex("by_workspace_project", (q) =>
				q
					.eq("workspaceId", user.currentWorkspaceId)
					.eq("projectId", args.projectId),
			)
			.collect();
	},
});

// Query to get all analytics data for a campaign
export const getAllCampaignAnalytics = query({
	args: {
		campaignId: v.id("campaigns"),
	},
	handler: async (ctx, args) => {
		await verifyCampaignAccess(ctx, args.campaignId);

		const allResults = await ctx.db
			.query("analyticsPipes")
			.withIndex("by_campaign_query", (q) =>
				q.eq("campaignId", args.campaignId),
			)
			.collect();

		const sumPrimitives = allResults.find(
			(r) => r.queryId === "sum-primitives",
		);
		const timeseriesPrimitives = allResults.find(
			(r) => r.queryId === "timeseries-primitives",
		);
		const audienceBreakdown = allResults.find(
			(r) => r.queryId === "audience-breakdown",
		);
		const conversionsBreakdown = allResults.find(
			(r) => r.queryId === "conversions-breakdown",
		);
		const realtimeOverview = allResults.find(
			(r) => r.queryId === "realtime-overview",
		);

		return {
			sumPrimitives: sumPrimitives as Extract<
				Doc<"analyticsPipes">,
				{ queryId: "sum-primitives" }
			> | null,
			timeseriesPrimitives: timeseriesPrimitives as Extract<
				Doc<"analyticsPipes">,
				{ queryId: "timeseries-primitives" }
			> | null,
			audienceBreakdown: audienceBreakdown as Extract<
				Doc<"analyticsPipes">,
				{ queryId: "audience-breakdown" }
			> | null,
			conversionsBreakdown: conversionsBreakdown as Extract<
				Doc<"analyticsPipes">,
				{ queryId: "conversions-breakdown" }
			> | null,
			realtimeOverview: realtimeOverview as Extract<
				Doc<"analyticsPipes">,
				{ queryId: "realtime-overview" }
			> | null,
		};
	},
});
