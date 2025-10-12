import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
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
		// Get the invitations
		const { page, continueCursor } = await ctx.db
			.query("invitations")
			.withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId))
			.paginate({
				numItems,
				cursor: cursor ?? null,
			});

		// If there are no invitations, return
		if (page.length === 0) {
			return;
		}

		// Delete the invitations
		await asyncMap(
			page,
			async (invitation) => await ctx.db.delete(invitation._id),
		);

		// If there are more invitations, delete them
		if (
			continueCursor &&
			continueCursor !== cursor &&
			page.length === numItems
		) {
			await cascadePool.enqueueMutation(
				ctx,
				internal.collections.invitations.utils.batchDeleteByWorkspaceId,
				{
					workspaceId,
					cursor: continueCursor,
					numItems,
				},
			);
		}
	},
});
