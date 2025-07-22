import { defineTable } from "convex/server";
import { v } from "convex/values";

export const documentVectorsSchema = defineTable(
  v.object({
    embedding: v.array(v.float64()),

    // Relations
    workspaceId: v.id("workspaces"),
    knowledgeBaseId: v.id("knowledgeBases"),
    projectId: v.id("projects"),
    documentId: v.id("documents"),
    chunkId: v.id("documentChunks"),
  })
)
  .index("by_workspace_id", ["workspaceId"])
  .index("by_project_id", ["projectId"])
  .index("by_document_id", ["documentId"])
  .index("by_chunk_id", ["chunkId"])
  .index("by_knowledge_base_id", ["knowledgeBaseId"])
  .vectorIndex("by_emmbedings", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["projectId", "knowledgeBaseId", "documentId"],
  });
