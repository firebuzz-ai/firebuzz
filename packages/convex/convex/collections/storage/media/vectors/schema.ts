import { defineTable } from "convex/server";
import { v } from "convex/values";

export const mediaVectorsSchema = defineTable(
	v.object({
		embedding: v.array(v.float64()),
		// Relations
		mediaId: v.id("media"),
		projectId: v.id("projects"),
		workspaceId: v.id("workspaces"),
	}),
)
	.index("by_workspace_id", ["workspaceId"])
	.index("by_project_id", ["projectId"])
	.index("by_media_id", ["mediaId"])
	.vectorIndex("by_emmbedings", {
		vectorField: "embedding",
		dimensions: 1536,
		filterFields: ["projectId"],
	});
