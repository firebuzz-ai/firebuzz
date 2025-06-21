import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";
import { cascadePool } from "../../../components/workpools";

export const batchDelete = internalMutation({
	args: {
		cursor: v.optional(v.string()),
		projectId: v.id("projects"),
		numItems: v.number(),
	},
	handler: async (ctx, { projectId, cursor, numItems }) => {
		const { page, continueCursor } = await ctx.db
			.query("media")
			.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
			.paginate({ numItems, cursor: cursor ?? null });

		// If there are no media items, return
		if (page.length === 0) {
			return;
		}

		// Delete the media
		await asyncMap(page, (document) =>
			ctx.runMutation(
				internal.collections.storage.media.mutations.deleteInternal,
				{ id: document._id },
			),
		);

		// Continue deleting media items if there are more
		if (
			continueCursor &&
			continueCursor !== cursor &&
			page.length === numItems
		) {
			await cascadePool.enqueueMutation(
				ctx,
				internal.collections.storage.media.utils.batchDelete,
				{
					projectId,
					cursor: continueCursor,
					numItems,
				},
			);
		}
	},
});

export const deleteCleanup = internalMutation({
	args: {
		cursor: v.optional(v.string()),
		numItems: v.number(),
		deletionThresholdTimestamp: v.optional(v.string()),
	},
	handler: async (ctx, { cursor, numItems, deletionThresholdTimestamp }) => {
		const threshold =
			deletionThresholdTimestamp ??
			new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

		// Get the medias that are scheduled to be deleted
		const { page, continueCursor } = await ctx.db
			.query("media")
			.withIndex("by_deleted_at", (q) => q.lte("deletedAt", threshold))
			.filter((q) => q.neq(q.field("deletedAt"), undefined))
			.paginate({
				numItems,
				cursor: cursor ?? null,
			});

		// If there are no medias, return
		if (page.length === 0) {
			return;
		}

		// Delete the medias
		await asyncMap(page, (media) =>
			ctx.runMutation(
				internal.collections.storage.media.mutations.deleteInternal,
				{ id: media._id },
			),
		);

		// If there are more medias, delete them
		if (
			continueCursor &&
			continueCursor !== cursor &&
			page.length === numItems
		) {
			await cascadePool.enqueueMutation(
				ctx,
				internal.collections.storage.media.utils.deleteCleanup,
				{
					cursor: continueCursor,
					numItems,
					deletionThresholdTimestamp: threshold,
				},
			);
		}
	},
});
