import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
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
      .query("documentVectors")
      .withIndex("by_document_id", (q) => q.eq("documentId", documentId))
      .paginate({ numItems, cursor: cursor ?? null });

    // If there are no documents, return
    if (page.length === 0) {
      return;
    }

    // Delete the document vectors
    await asyncMap(page, (document) => ctx.db.delete(document._id));

    // Continue deleting document vectors if there are more
    if (
      continueCursor &&
      continueCursor !== cursor &&
      page.length === numItems
    ) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.storage.documents.vectors.utils.batchDelete,
        {
          documentId,
          cursor: continueCursor,
          numItems,
        }
      );
    }
  },
});

export const batchDeleteByKnowledgeBaseId = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    knowledgeBaseId: v.id("knowledgeBases"),
    numItems: v.number(),
  },
  handler: async (ctx, { knowledgeBaseId, cursor, numItems }) => {
    const { page, continueCursor } = await ctx.db
      .query("documentVectors")
      .withIndex("by_knowledge_base_id", (q) =>
        q.eq("knowledgeBaseId", knowledgeBaseId)
      )
      .paginate({ numItems, cursor: cursor ?? null });

    // If there are no documents, return
    if (page.length === 0) {
      return;
    }

    // Delete the document vectors
    await asyncMap(page, (document) => ctx.db.delete(document._id));

    // Continue deleting document vectors if there are more
    if (
      continueCursor &&
      continueCursor !== cursor &&
      page.length === numItems
    ) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.storage.documents.vectors.utils
          .batchDeleteByKnowledgeBaseId,
        {
          knowledgeBaseId,
          cursor: continueCursor,
          numItems,
        }
      );
    }
  },
});
