import { v } from "convex/values";

export const documentChunksSchema = v.object({
	workspaceId: v.id("workspaces"),
	projectId: v.id("projects"),
	documentId: v.id("documents"),
	index: v.number(),
	content: v.string(),
});
