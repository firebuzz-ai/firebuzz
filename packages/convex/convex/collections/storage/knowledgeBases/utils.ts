import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";
import { cascadePool } from "../../../workpools";

export const batchDelete = internalMutation({
	args: {
		cursor: v.optional(v.string()),
		projectId: v.id("projects"),
		numItems: v.number(),
	},
	handler: async (ctx, { projectId, cursor, numItems }) => {
		// Get the knowledge bases
		const { page, continueCursor } = await ctx.db
			.query("knowledgeBases")
			.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
			.paginate({
				numItems,
				cursor: cursor ?? null,
			});

		// If there are no knowledge bases, return
		if (page.length === 0) {
			return;
		}

		// Delete the knowledge bases
		await asyncMap(
			page,
			async (knowledgeBase) =>
				await ctx.runMutation(
					internal.collections.storage.knowledgeBases.mutations
						.deletePermananentInternal,
					{
						id: knowledgeBase._id,
					},
				),
		);

		// If there are more knowledge bases, delete them
		if (
			continueCursor &&
			continueCursor !== cursor &&
			page.length === numItems
		) {
			await cascadePool.enqueueMutation(
				ctx,
				internal.collections.storage.knowledgeBases.utils.batchDelete,
				{
					projectId,
					cursor: continueCursor,
					numItems,
				},
			);
		}
	},
});
