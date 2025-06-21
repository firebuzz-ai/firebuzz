import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { getCurrentUserWithWorkspace } from "../users/utils";
import { domainSchema } from "./schema";

export const getPaginated = query({
	args: {
		paginationOpts: paginationOptsValidator,
		sortOrder: v.union(v.literal("asc"), v.literal("desc")),
		status: v.optional(domainSchema.fields.status),
		searchQuery: v.optional(v.string()),
		isArchived: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		{ paginationOpts, sortOrder, status, searchQuery, isArchived },
	) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const projectId = user?.currentProjectId;

		if (!user || !projectId) {
			throw new ConvexError("User not found");
		}

		// If there's a search query, use the search index
		const query = searchQuery
			? ctx.db
					.query("domains")
					.withSearchIndex("by_hostname", (q) =>
						q.search("hostname", searchQuery),
					)
					.filter((q) => q.eq(q.field("projectId"), projectId))
					.filter((q) => (status ? q.eq(q.field("status"), status) : true))
					.filter((q) =>
						isArchived
							? q.eq(q.field("isArchived"), isArchived ?? false)
							: true,
					)
					.filter((q) => q.eq(q.field("deletedAt"), undefined))
					.paginate(paginationOpts)
			: ctx.db
					.query("domains")
					.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
					.filter((q) =>
						isArchived
							? q.eq(q.field("isArchived"), isArchived ?? false)
							: true,
					)
					.filter((q) => (status ? q.eq(q.field("status"), status) : true))
					.filter((q) => q.eq(q.field("deletedAt"), undefined))
					.order(sortOrder)
					.paginate(paginationOpts);

		return await query;
	},
});

export const getById = query({
	args: {
		id: v.id("domains"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const domain = await ctx.db.get(args.id);

		if (!domain) {
			throw new ConvexError("Custom domain not found");
		}

		// Check if user has access to this domain
		if (!user || user.currentWorkspaceId !== domain.workspaceId) {
			throw new ConvexError("Not authorized");
		}

		const createdBy = await ctx.db.get(domain.createdBy);
		return {
			...domain,
			createdBy,
		};
	},
});

export const getByIdInternal = internalQuery({
	args: {
		id: v.id("domains"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const getActiveByProject = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, { projectId }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		if (!user) {
			throw new ConvexError("User not found");
		}

		return await ctx.db
			.query("domains")
			.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
			.filter((q) => q.eq(q.field("workspaceId"), user.currentWorkspaceId))
			.filter((q) => q.eq(q.field("status"), "active"))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.filter((q) => q.neq(q.field("isArchived"), true))
			.collect();
	},
});
