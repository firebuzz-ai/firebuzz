import { defineTable } from "convex/server";
import { v } from "convex/values";

export const documentChunksSchema = defineTable(
	v.object({
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		documentId: v.id("documents"),
		index: v.number(),
		content: v.string(),
	}),
)
	.index("by_workspace_id", ["workspaceId"])
	.index("by_project_id", ["projectId"])
	.index("by_document_id", ["documentId"]);
