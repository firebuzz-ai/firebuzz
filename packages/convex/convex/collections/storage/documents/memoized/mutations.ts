import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";

export const create = internalMutation({
	args: {
		documentId: v.id("documents"),
		knowledgeBases: v.array(v.id("knowledgeBases")),
	},
	handler: async (ctx, args) => {
		await asyncMap(args.knowledgeBases, async (knowledgeBase) => {
			await ctx.db.insert("memoizedDocuments", {
				documentId: args.documentId,
				knowledgeBaseId: knowledgeBase,
			});
		});
	},
});

export const deletePermanentByDocumentId = internalMutation({
	args: {
		documentId: v.id("documents"),
	},
	handler: async (ctx, args) => {
		const items = await ctx.db
			.query("memoizedDocuments")
			.withIndex("by_document_id", (q) => q.eq("documentId", args.documentId))
			.collect();

		if (!items) {
			return;
		}

		await asyncMap(items, (item) => ctx.db.delete(item._id));
	},
});
