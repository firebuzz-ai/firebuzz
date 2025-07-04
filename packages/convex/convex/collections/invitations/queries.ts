import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";
import { invitationSchema } from "./schema";

export const getPaginated = query({
	args: {
		paginationOpts: paginationOptsValidator,
		sortOrder: v.union(v.literal("asc"), v.literal("desc")),
		status: v.optional(invitationSchema.fields.status),
		searchQuery: v.optional(v.string()),
	},
	handler: async (ctx, { paginationOpts, sortOrder, status, searchQuery }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// If there's a search query, use the search index (if available)
		const query = searchQuery
			? ctx.db
					.query("invitations")
					.withIndex("by_workspace_id", (q) =>
						q.eq("workspaceId", user.currentWorkspaceId),
					)
					.filter((q) => q.gte(q.field("email"), searchQuery))
					.filter((q) => q.lte(q.field("email"), `${searchQuery}\uffff`))
					.filter((q) => (status ? q.eq(q.field("status"), status) : true))
					.order(sortOrder)
					.paginate(paginationOpts)
			: ctx.db
					.query("invitations")
					.withIndex("by_workspace_id", (q) =>
						q.eq("workspaceId", user.currentWorkspaceId),
					)
					.filter((q) => (status ? q.eq(q.field("status"), status) : true))
					.order(sortOrder)
					.paginate(paginationOpts);

		return await query;
	},
});

export const getByWorkspace = query({
	handler: async (ctx) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		return await ctx.db
			.query("invitations")
			.withIndex("by_workspace_id", (q) =>
				q.eq("workspaceId", user.currentWorkspaceId),
			)
			.collect();
	},
});

export const getByExternalIdInternal = internalQuery({
	args: { externalId: v.string() },
	handler: async (ctx, { externalId }) => {
		return await ctx.db
			.query("invitations")
			.withIndex("by_external_id", (q) => q.eq("externalId", externalId))
			.first();
	},
});
