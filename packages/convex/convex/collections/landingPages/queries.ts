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

export const getByIdWithSignedUrlInternal = internalQuery({
	args: {
		id: v.id("landingPages"),
	},
	handler: async (ctx, args) => {
		// Get landing page
		const landingPage = await ctx.db.get(args.id);

		if (!landingPage || landingPage.deletedAt) {
			return null;
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

// Get paginated main landing pages by campaign ID (no originalId, no parentId, isChampion = true)
export const getByCampaignIdPaginated = query({
	args: {
		campaignId: v.id("campaigns"),
		paginationOpts: paginationOptsValidator,
		sortOrder: v.union(v.literal("asc"), v.literal("desc")),
	},
	handler: async (ctx, { campaignId, paginationOpts, sortOrder }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		// Get the campaign to verify workspace access
		const campaign = await ctx.db.get(campaignId);
		if (!campaign || campaign.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Campaign not found or unauthorized");
		}

		// Get all main landing pages for this campaign
		const landingPages = await ctx.db
			.query("landingPages")
			.withIndex("by_campaign_id", (q) => q.eq("campaignId", campaignId))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.filter((q) => q.eq(q.field("isArchived"), false))
			.filter((q) => q.eq(q.field("isChampion"), true))
			.filter((q) => q.eq(q.field("originalId"), undefined))
			.filter((q) => q.eq(q.field("parentId"), undefined))
			.order(sortOrder)
			.paginate(paginationOpts);

		// Enrich with creator info and counts
		const enrichedPages = await Promise.all(
			landingPages.page.map(async (page) => {
				const creator = await ctx.db.get(page.createdBy);

				// Count variants
				const variantsCount = await ctx.db
					.query("landingPages")
					.withIndex("by_parent_id", (q) => q.eq("parentId", page._id))
					.filter((q) => q.eq(q.field("deletedAt"), undefined))
					.filter((q) => q.eq(q.field("isArchived"), false))
					.collect()
					.then((variants) => variants.length);

				// Count translations
				const translationsCount = await ctx.db
					.query("landingPages")
					.withIndex("by_original_id", (q) => q.eq("originalId", page._id))
					.filter((q) => q.eq(q.field("deletedAt"), undefined))
					.filter((q) => q.eq(q.field("isArchived"), false))
					.collect()
					.then((translations) => translations.length);

				return {
					...page,
					creator: creator
						? {
								_id: creator._id,
								name: creator.fullName,
								email: creator.email,
								imageKey: creator.imageKey,
							}
						: null,
					variantsCount,
					translationsCount,
				};
			}),
		);

		return {
			...landingPages,
			page: enrichedPages,
		};
	},
});

// Get landing page by ID with its variants and translations
export const getByIdWithVariantsAndTranslations = query({
	args: {
		id: v.id("landingPages"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		// Get landing page
		const landingPage = await ctx.db.get(args.id);

		if (!landingPage || landingPage.deletedAt) {
			return null;
		}

		if (landingPage.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Get signed URL if version exists
		let signedUrl: string | undefined;
		if (landingPage.landingPageVersionId) {
			const landingPageVersion = await ctx.db.get(
				landingPage.landingPageVersionId,
			);

			if (landingPageVersion?.key) {
				signedUrl = await r2.getUrl(landingPageVersion.key);
			}
		}

		// Get variants (where parentId = this landing page ID)
		const variants = await ctx.db
			.query("landingPages")
			.withIndex("by_parent_id", (q) => q.eq("parentId", args.id))
			.filter((q) => q.eq(q.field("workspaceId"), user.currentWorkspaceId))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.filter((q) => q.eq(q.field("isArchived"), false))
			.order("desc")
			.collect();

		// Get translations (where originalId = this landing page ID)
		const translations = await ctx.db
			.query("landingPages")
			.withIndex("by_original_id", (q) => q.eq("originalId", args.id))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.filter((q) => q.eq(q.field("isArchived"), false))
			.collect();

		return {
			...landingPage,
			signedUrl,
			variants,
			translations,
		};
	},
});
