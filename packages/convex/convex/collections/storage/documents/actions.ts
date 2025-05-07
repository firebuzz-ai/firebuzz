import { embedMany } from "ai";
import { asyncMap } from "convex-helpers";
import { ConvexError, v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalAction } from "../../../_generated/server";
import { openai } from "../../../lib/openai";
import { documentsSchema } from "./schema";

export const chunkAndVectorize = internalAction({
  args: {
    key: v.string(),
    type: documentsSchema.fields.type,
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    documentId: v.id("documents"),
    memories: v.array(v.id("memories")),
  },
  handler: async (ctx, args) => {
    const { key, type, workspaceId, projectId, documentId, memories } = args;

    try {
      // Update Status to Processing
      await ctx.runMutation(
        internal.collections.storage.documents.mutations
          .updateVectorizationStatus,
        {
          documentId,
          status: "processing",
        }
      );

      // Create Chunks
      const chunks = await ctx.runAction(
        internal.helpers.chunks.createFileChunks,
        {
          key,
          type,
          workspaceId,
          projectId,
          documentId,
        }
      );

      // Vectorize Chunks
      const embeddings = await embedMany({
        model: openai.embedding("text-embedding-3-large", {
          dimensions: 1536,
        }),
        values: chunks.map((chunk) => chunk.content),
      });

      // Create Document Vector Items
      await asyncMap(chunks, async (chunk, index) => {
        await ctx.runMutation(
          internal.collections.storage.documentVectors.mutations.createInternal,
          {
            documentId,
            projectId,
            workspaceId,
            embedding: embeddings.embeddings[index],
            tags: memories,
            chunkId: chunk.id,
          }
        );
      });

      // Update Status to Completed
      await ctx.runMutation(
        internal.collections.storage.documents.mutations
          .updateVectorizationStatus,
        {
          documentId,
          status: "completed",
        }
      );
    } catch (error) {
      // Update Status to Failed
      await ctx.runMutation(
        internal.collections.storage.documents.mutations
          .updateVectorizationStatus,
        {
          documentId,
          status: "failed",
        }
      );

      console.error(error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to vectorize document");
    }
  },
});
