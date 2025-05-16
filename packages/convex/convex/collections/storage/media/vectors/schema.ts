import { v } from "convex/values";

export const mediaVectorsSchema = v.object({
	embedding: v.array(v.float64()),
	// Relations
	mediaId: v.id("media"),
	projectId: v.id("projects"),
	workspaceId: v.id("workspaces"),
});
