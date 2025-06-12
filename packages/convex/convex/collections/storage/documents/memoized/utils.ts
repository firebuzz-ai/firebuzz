import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../../../_generated/api";
import { internalMutation } from "../../../../_generated/server";
import { cascadePool } from "../../../../components/workpools";

export const batchDeleteByKnowledgeBaseId = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    numItems: v.number(),
    knowledgeBaseId: v.id("knowledgeBases"),
  },
  handler: async (ctx, { cursor, numItems, knowledgeBaseId }) => {
    const { page, continueCursor } = await ctx.db
      .query("memoizedDocuments")
      .withIndex("by_knowledge_base", (q) =>
        q.eq("knowledgeBaseId", knowledgeBaseId)
      )
      .paginate({ numItems, cursor: cursor ?? null });

    // If there are no documents, return
    if (page.length === 0) {
      return;
    }

    // Update the knowledge base id
    await asyncMap(page, async (item) => {
      const document = await ctx.db.get(item.documentId);

      const knowledgeBases =
        document?.knowledgeBases.filter((f) => f !== item.knowledgeBaseId) ??
        [];
      const vectorizationStatus =
        knowledgeBases?.length && knowledgeBases.length > 0
          ? document?.vectorizationStatus
          : "not-indexed"; // If it's the last knowledge base, set the vectorization status to not-indexed

      const indexedAt =
        vectorizationStatus === "indexed" ? document?.indexedAt : undefined;

      await ctx.db.patch(item.documentId, {
        knowledgeBases,
        vectorizationStatus,
        indexedAt,
      });
    });

    // Delete the memoized documents
    await asyncMap(page, async (item) => {
      await ctx.runMutation(
        internal.collections.storage.documents.memoized.mutations
          .deletePermanentInternal,
        {
          id: item._id,
        }
      );
    });

    // Continue updating the knowledge base id if there are more documents
    if (
      continueCursor &&
      continueCursor !== cursor &&
      page.length === numItems
    ) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.storage.documents.memoized.utils
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

export const batchDeleteByDocumentId = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    numItems: v.number(),
    documentId: v.id("documents"),
  },
  handler: async (ctx, { cursor, numItems, documentId }) => {
    const { page, continueCursor } = await ctx.db
      .query("memoizedDocuments")
      .withIndex("by_document_id", (q) => q.eq("documentId", documentId))
      .paginate({ numItems, cursor: cursor ?? null });

    // If there are no documents, return
    if (page.length === 0) {
      return;
    }

    // Delete the memoized documents
    await asyncMap(page, async (item) => {
      await ctx.runMutation(
        internal.collections.storage.documents.memoized.mutations
          .deletePermanentInternal,
        {
          id: item._id,
        }
      );
    });

    // Continue updating the knowledge base id if there are more documents
    if (
      continueCursor &&
      continueCursor !== cursor &&
      page.length === numItems
    ) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.storage.documents.memoized.utils
          .batchDeleteByDocumentId,
        {
          documentId,
          cursor: continueCursor,
          numItems,
        }
      );
    }
  },
});
