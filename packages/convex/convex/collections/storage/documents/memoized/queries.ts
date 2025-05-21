import { v } from "convex/values";
import { internalQuery } from "../../../../_generated/server";

export const getByDocumentAndKnowledgeBaseInternal = internalQuery({
  args: {
    documentId: v.id("documents"),
    knowledgeBaseId: v.id("knowledgeBases"),
  },
  handler: async (ctx, args) => {
    const memoizedDocument = await ctx.db
      .query("memoizedDocuments")
      .withIndex("by_document_id_knowledge_base", (q) =>
        q
          .eq("documentId", args.documentId)
          .eq("knowledgeBaseId", args.knowledgeBaseId)
      )
      .first();
    return memoizedDocument;
  },
});
