import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import { cascadePool } from "../../components/workpools";

export const batchDeleteByWorkspaceId = internalMutation({
	args: {
		cursor: v.optional(v.string()),
		workspaceId: v.id("workspaces"),
		numItems: v.number(),
	},
	handler: async (ctx, { workspaceId, cursor, numItems }) => {
		// Get the members
		const { page, continueCursor } = await ctx.db
			.query("members")
			.withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId))
			.paginate({
				numItems,
				cursor: cursor ?? null,
			});

		// If there are no members, return
		if (page.length === 0) {
			return;
		}

		// Delete the members
		await asyncMap(page, async (member) => await ctx.db.delete(member._id));

		// If there are more members, delete them
		if (
			continueCursor &&
			continueCursor !== cursor &&
			page.length === numItems
		) {
			await cascadePool.enqueueMutation(
				ctx,
				internal.collections.members.utils.batchDeleteByWorkspaceId,
				{
					workspaceId,
					cursor: continueCursor,
					numItems,
				},
			);
		}
	},
});

export const deleteByUserId = internalMutation({
	args: {
		userId: v.id("users"),
	},
	handler: async (ctx, { userId }) => {
		const members = await ctx.db
			.query("members")
			.withIndex("by_user_id", (q) => q.eq("userId", userId))
			.collect();

		await asyncMap(members, async (member) => await ctx.db.delete(member._id));
	},
});
