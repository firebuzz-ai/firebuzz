import { v } from "convex/values";
import { internalQuery } from "../../../../_generated/server";

export const getByDocumentId = internalQuery({
	args: {
		documentId: v.id("documents"),
	},
	handler: async (ctx, args) => {
		const { documentId } = args;
		const chunks = await ctx.db
			.query("documentChunks")
			.withIndex("by_document_id", (q) => q.eq("documentId", documentId))
			.collect();
		return chunks;
	},
});

export const getById = internalQuery({
	args: {
		id: v.id("documentChunks"),
	},
	handler: async (ctx, args) => {
		const { id } = args;
		const chunk = await ctx.db.get(id);
		return chunk;
	},
});
