import { v } from "convex/values";

export const documentVectorsSchema = v.object({
  embedding: v.array(v.float64()),
  tags: v.array(v.id("memories")),
  // Relations
  workspaceId: v.id("workspaces"),
  projectId: v.id("projects"),
  documentId: v.id("documents"),
  chunkId: v.id("documentChunks"),
});
