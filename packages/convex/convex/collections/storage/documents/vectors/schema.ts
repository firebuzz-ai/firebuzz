import { v } from "convex/values";

export const documentVectorsSchema = v.object({
	embedding: v.array(v.float64()),

	// Relations
	workspaceId: v.id("workspaces"),
	knowledgeBaseId: v.id("knowledgeBases"),
	projectId: v.id("projects"),
	documentId: v.id("documents"),
	chunkId: v.id("documentChunks"),
});
