import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { internal } from "../../../../_generated/api";
import { internalMutation } from "../../../../_generated/server";
import { cascadePool } from "../../../../components/workpools";

export const batchDelete = internalMutation({
	args: {
		cursor: v.optional(v.string()),
		documentId: v.id("documents"),
		numItems: v.number(),
	},
	handler: async (ctx, { documentId, cursor, numItems }) => {
		const { page, continueCursor } = await ctx.db
			.query("documentChunks")
			.withIndex("by_document_id", (q) => q.eq("documentId", documentId))
			.paginate({ numItems, cursor: cursor ?? null });

		// If there are no document chunks, return
		if (page.length === 0) {
			return;
		}

		// Delete the document chunks
		await asyncMap(page, (document) =>
			ctx.runMutation(
				internal.collections.storage.documents.chunks.mutations
					.deletePermanentInternal,
				{ id: document._id },
			),
		);

		// Continue deleting document chunks if there are more
		if (
			continueCursor &&
			continueCursor !== cursor &&
			page.length === numItems
		) {
			await cascadePool.enqueueMutation(
				ctx,
				internal.collections.storage.documents.chunks.utils.batchDelete,
				{
					documentId,
					cursor: continueCursor,
					numItems,
				},
			);
		}
	},
});
