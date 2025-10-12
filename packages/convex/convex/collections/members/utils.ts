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
		ownerId: v.optional(v.id("users")), // If provided, the owner will not be deleted
	},
	handler: async (ctx, { workspaceId, cursor, numItems, ownerId }) => {
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
		await asyncMap(
			page.filter(ownerId ? (member) => member.userId !== ownerId : () => true),
			async (member) => {
				// Get the user
				const user = await ctx.db.get(member.userId);

				if (user) {
					// Update user's current workspace
					await ctx.db.patch(member.userId, {
						currentWorkspaceId: undefined,
						currentProjectId: undefined,
					});

					// Remove member from Clerk organization (Webhook will handle deleting Convex)
					await ctx.scheduler.runAfter(
						0,
						internal.lib.clerk.removeClerkMemberInternal,
						{
							userExternalId: user.externalId,
							organizationExternalId: member.organizationExternalId,
						},
					);
				}
			},
		);

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
					ownerId,
				},
			);
		}
	},
});
