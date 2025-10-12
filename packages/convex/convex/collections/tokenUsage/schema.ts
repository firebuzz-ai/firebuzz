import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tokenUsageSchema = defineTable(
	v.object({
		inputTokens: v.number(),
		cachedInputTokens: v.number(),
		outputTokens: v.number(),
		reasoningTokens: v.number(),
		totalTokens: v.number(),
		model: v.string(),
		provider: v.string(),
		cost: v.number(),
		outputType: v.union(v.literal("text"), v.literal("image")),
		// Relations
		sessionId: v.optional(v.id("agentSessions")),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		userId: v.id("users"),
	}),
)
	.index("by_workspace_id", ["workspaceId"])
	.index("by_project_id", ["projectId"])
	.index("by_user_id", ["userId"])
	.index("by_session_id", ["sessionId"]);
