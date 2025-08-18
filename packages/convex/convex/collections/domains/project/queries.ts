import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";
import { getCurrentUserWithWorkspace } from "../../users/utils";

export const getByProject = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, { projectId }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		if (!user) {
			throw new ConvexError("User not found");
		}

		return await ctx.db
			.query("projectDomains")
			.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
			.filter((q) => q.eq(q.field("workspaceId"), user.currentWorkspaceId))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.filter((q) => q.neq(q.field("isArchived"), true))
			.order("desc")
			.collect();
	},
});

export const getByProjectIdInternal = internalQuery({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, { projectId }) => {
		return await ctx.db
			.query("projectDomains")
			.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.filter((q) => q.neq(q.field("isArchived"), true))
			.collect();
	},
});

export const getByIdInternal = internalQuery({
	args: {
		id: v.id("projectDomains"),
	},
	handler: async (ctx, { id }) => {
		return await ctx.db.get(id);
	},
});

export const checkSubdomainIsAvailable = internalQuery({
	args: {
		subdomain: v.string(),
		existingId: v.optional(v.id("projectDomains")),
	},
	handler: async (ctx, { subdomain, existingId }) => {
		const projectDomain = await ctx.db
			.query("projectDomains")
			.withIndex("by_subdomain", (q) => q.eq("subdomain", subdomain))
			.filter((q) => q.neq(q.field("_id"), existingId))
			.first();

		return !projectDomain;
	},
});
