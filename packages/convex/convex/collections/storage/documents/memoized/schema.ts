import { defineTable } from "convex/server";
import { v } from "convex/values";

export const memoizedDocumentsSchema = defineTable(
	v.object({
		documentId: v.id("documents"),
		knowledgeBaseId: v.id("knowledgeBases"),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
	}),
)
	.index("by_knowledge_base", ["knowledgeBaseId"])
	.index("by_document_id", ["documentId"])
	.index("by_document_id_knowledge_base", ["documentId", "knowledgeBaseId"]);
