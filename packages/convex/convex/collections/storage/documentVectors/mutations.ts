import { v } from "convex/values";
import { internalMutation } from "../../../_generated/server";

export const createInternal = internalMutation({
  args: {
    documentId: v.id("documents"),
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
    embedding: v.array(v.float64()),
    tags: v.array(v.id("memories")),
    chunkId: v.id("documentChunks"),
  },
  handler: async (ctx, args) => {
    const { documentId, projectId, workspaceId, embedding, tags, chunkId } =
      args;

    const key = await ctx.db.insert("documentVectors", {
      documentId,
      projectId,
      workspaceId,
      embedding,
      tags,
      chunkId,
    });

    return key;
  },
});

export const deleteByDocumentIdInternal = internalMutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const { documentId } = args;

    const vector = await ctx.db
      .query("documentVectors")
      .withIndex("by_document_id", (q) => q.eq("documentId", documentId))
      .first();

    if (vector) {
      await ctx.db.delete(vector._id);
    }
  },
});
