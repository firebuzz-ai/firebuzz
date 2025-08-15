import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { aggregateLandingPages } from "../../components/aggregates";
import { r2 } from "../../components/r2";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";

export const getPaginated = query({
	args: {
		projectId: v.id("projects"),
		paginationOpts: paginationOptsValidator,
		sortOrder: v.union(v.literal("asc"), v.literal("desc")),
		searchQuery: v.optional(v.string()),
		isArchived: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		{ projectId, paginationOpts, sortOrder, searchQuery, isArchived },
	) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const query = searchQuery
			? ctx.db
					.query("landingPages")
					.withSearchIndex("by_title", (q) => q.search("title", searchQuery))
					.filter((q) => q.eq(q.field("workspaceId"), user.currentWorkspaceId))
					.filter((q) =>
						projectId ? q.eq(q.field("projectId"), projectId) : true,
					)
					.filter((q) =>
						isArchived ? q.eq(q.field("isArchived"), isArchived) : true,
					)
					.filter((q) => q.eq(q.field("deletedAt"), undefined))
					.paginate(paginationOpts)
			: ctx.db
					.query("landingPages")
					.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
					.filter((q) => q.eq(q.field("workspaceId"), user.currentWorkspaceId))
					.filter((q) => q.eq(q.field("deletedAt"), undefined))
					.filter((q) =>
						isArchived ? q.eq(q.field("isArchived"), isArchived) : true,
					)
					.order(sortOrder)
					.paginate(paginationOpts);

		return await query;
	},
});

export const getTotalCount = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		return await aggregateLandingPages.count(ctx, {
			namespace: args.projectId,
			// @ts-ignore
			bounds: {},
		});
	},
});

export const getById = query({
	args: {
		id: v.id("landingPages"),
	},
	handler: async (ctx, args) => {
		// Get current user
		const user = await getCurrentUserWithWorkspace(ctx);
		// Get landing page
		const landingPage = await ctx.db.get(args.id);

		if (!landingPage || landingPage.deletedAt) {
			return null;
		}

		if (landingPage.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		if (landingPage.landingPageVersionId === undefined) {
			return null;
		}

		// Get current version
		const landingPageVersion = await ctx.db.get(
			landingPage.landingPageVersionId,
		);

		if (!landingPageVersion || !landingPageVersion.key) {
			return null;
		}

		const signedUrl = await r2.getUrl(landingPageVersion.key);

		return {
			...landingPage,
			signedUrl,
		};
	},
});

export const getByIdInternal = internalQuery({
	args: {
		id: v.id("landingPages"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const getByCampaignId = query({
	args: {
		campaignId: v.id("campaigns"),
	},
	handler: async (ctx, { campaignId }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		// Get the campaign to verify workspace access
		const campaign = await ctx.db.get(campaignId);
		if (!campaign || campaign.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Campaign not found or unauthorized");
		}

		// Get all landing pages for this campaign
		const landingPages = await ctx.db
			.query("landingPages")
			.withIndex("by_campaign_id", (q) => q.eq("campaignId", campaignId))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.filter((q) => q.eq(q.field("isArchived"), false))
			.order("desc")
			.collect();

		return landingPages;
	},
});

// Only base landing pages (not translations, not variants)
export const getBaseByCampaignId = query({
	args: {
		campaignId: v.id("campaigns"),
	},
	handler: async (ctx, { campaignId }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		const campaign = await ctx.db.get(campaignId);
		if (!campaign || campaign.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Campaign not found or unauthorized");
		}

		const landingPages = await ctx.db
			.query("landingPages")
			.withIndex("by_campaign_id", (q) => q.eq("campaignId", campaignId))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.filter((q) => q.eq(q.field("isArchived"), false))
			.filter((q) => q.eq(q.field("isChampion"), true))
			.order("desc")
			.collect();

		return landingPages;
	},
});

export const getByParentId = query({
	args: {
		parentId: v.id("landingPages"),
	},
	handler: async (ctx, { parentId }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		// Get the parent landing page to verify workspace access
		const parentLandingPage = await ctx.db.get(parentId);
		if (
			!parentLandingPage ||
			parentLandingPage.workspaceId !== user.currentWorkspaceId
		) {
			throw new ConvexError("Parent landing page not found or unauthorized");
		}

		// Get all variant landing pages for this parent
		const variants = await ctx.db
			.query("landingPages")
			.withIndex("by_parent_id", (q) => q.eq("parentId", parentId))
			.filter((q) => q.eq(q.field("workspaceId"), user.currentWorkspaceId))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.filter((q) => q.eq(q.field("isArchived"), false))
			.order("desc")
			.collect();

		return variants;
	},
});

// Get translations for an original landing page
export const getTranslationsByOriginalId = query({
	args: {
		originalId: v.id("landingPages"),
	},
	handler: async (ctx, { originalId }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		// Ensure original exists and workspace matches
		const original = await ctx.db.get(originalId);
		if (!original || original.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Original landing page not found or unauthorized");
		}

		const translations = await ctx.db
			.query("landingPages")
			.withIndex("by_original_id", (q) => q.eq("originalId", originalId))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.filter((q) => q.eq(q.field("isArchived"), false))
			.collect();

		return translations;
	},
});
