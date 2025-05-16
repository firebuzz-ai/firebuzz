import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";

export const create = internalMutation({
	args: {
		documentId: v.id("documents"),
		content: v.string(),
		index: v.number(),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const { documentId, content, index, workspaceId, projectId } = args;

		const chunk = await ctx.db.insert("documentChunks", {
			workspaceId,
			projectId,
			documentId,
			content,
			index,
		});

		return chunk;
	},
});

export const deleteByDocumentId = internalMutation({
	args: {
		documentId: v.id("documents"),
	},
	handler: async (ctx, args) => {
		const { documentId } = args;
		const chunks = await ctx.db
			.query("documentChunks")
			.withIndex("by_document_id", (q) => q.eq("documentId", documentId))
			.collect();
		await asyncMap(chunks, (chunk) => ctx.db.delete(chunk._id));
	},
});
