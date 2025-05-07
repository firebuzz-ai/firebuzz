import { v } from "convex/values";
import { query } from "../../../_generated/server";

export const getByDocumentId = query({
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
