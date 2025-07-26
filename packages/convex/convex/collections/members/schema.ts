import { defineTable } from "convex/server";
import { v } from "convex/values";

export const memberSchema = defineTable(
	v.object({
		externalId: v.string(),
		role: v.union(v.literal("org:admin"), v.literal("org:member")),
		// Relations
		workspaceId: v.id("workspaces"),
		userId: v.id("users"),
		// Clerk Relations
		userExternalId: v.string(),
		organizationExternalId: v.string(),
		updatedAt: v.string(), // ISO string
	}),
)
	.index("by_workspace_id", ["workspaceId"])
	.index("by_user_id", ["userId"])
	.index("by_external_user_id", ["userExternalId"])
	.index("by_external_id", ["externalId"])
	.index("by_user_id_workspace_id", ["userId", "workspaceId"]);
