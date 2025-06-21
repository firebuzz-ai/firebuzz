import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "../../_generated/server";
import { aggregateCampaigns } from "../../components/aggregates";
import { getCurrentUserWithWorkspace } from "../users/utils";

export const getPaginated = query({
	args: {
		projectId: v.id("projects"),
		paginationOpts: paginationOptsValidator,
		sortOrder: v.union(v.literal("asc"), v.literal("desc")),
		campaignType: v.optional(
			v.union(v.literal("lead-generation"), v.literal("click-through")),
		),
		searchQuery: v.optional(v.string()),
		isArchived: v.optional(v.boolean()),
		isPublished: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		{
			projectId,
			paginationOpts,
			sortOrder,
			campaignType,
			searchQuery,
			isArchived,
			isPublished,
		},
	) => {
		// Check if user is authenticated
		const user = await getCurrentUserWithWorkspace(ctx);
		const query = searchQuery
			? ctx.db
					.query("campaigns")
					.withSearchIndex("by_title", (q) => q.search("title", searchQuery))
					.filter((q) => q.eq(q.field("workspaceId"), user.currentWorkspaceId))
					.filter((q) =>
						projectId ? q.eq(q.field("projectId"), projectId) : true,
					)
					.filter((q) =>
						isArchived ? q.eq(q.field("isArchived"), isArchived) : true,
					)
					.filter((q) => q.eq(q.field("deletedAt"), undefined))
					.filter((q) =>
						campaignType ? q.eq(q.field("type"), campaignType) : true,
					)
					.filter((q) =>
						isPublished ? q.eq(q.field("isPublished"), isPublished) : true,
					)
					.paginate(paginationOpts)
			: ctx.db
					.query("campaigns")
					.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
					.filter((q) => q.eq(q.field("workspaceId"), user.currentWorkspaceId))
					.filter((q) => q.eq(q.field("deletedAt"), undefined))
					.filter((q) =>
						isArchived ? q.eq(q.field("isArchived"), isArchived) : true,
					)
					.filter((q) =>
						campaignType ? q.eq(q.field("type"), campaignType) : true,
					)
					.filter((q) =>
						isPublished ? q.eq(q.field("isPublished"), isPublished) : true,
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
		return await aggregateCampaigns.count(ctx, {
			namespace: args.projectId,
			// @ts-ignore
			bounds: {},
		});
	},
});

export const getById = query({
	args: {
		id: v.id("campaigns"),
	},
	handler: async (ctx, args) => {
		// Check if user is authenticated
		await getCurrentUserWithWorkspace(ctx);

		// Get campaign by id
		const campaign = await ctx.db.get(args.id);

		if (!campaign) {
			throw new ConvexError("Campaign not found");
		}

		return campaign;
	},
});
