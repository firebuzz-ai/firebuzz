import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "../../_generated/server";
import { aggregateLandingPages } from "../../components/aggregates";
import { r2 } from "../../components/r2";
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
			throw new ConvexError("Landing page not found");
		}

		if (landingPage.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		if (landingPage.landingPageVersionId === undefined) {
			throw new ConvexError("Landing page version not found");
		}

		// Get current version
		const landingPageVersion = await ctx.db.get(
			landingPage.landingPageVersionId,
		);

		if (!landingPageVersion || !landingPageVersion.key) {
			throw new ConvexError("Landing page version not found");
		}

		const signedUrl = await r2.getUrl(landingPageVersion.key);

		return {
			...landingPage,
			signedUrl,
		};
	},
});
