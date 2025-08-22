import { defineTable } from "convex/server";
import { v } from "convex/values";

export const invitationSchema = defineTable(
	v.object({
		email: v.string(),
		externalId: v.string(),
		organizationExternalId: v.string(),
		status: v.union(
			v.literal("pending"),
			v.literal("accepted"),
			v.literal("revoked"),
			v.literal("expired"),
		),
		role: v.union(v.literal("org:admin"), v.literal("org:member")),
		// Realtions
		invitedBy: v.id("users"),
		workspaceId: v.id("workspaces"),
		updatedAt: v.optional(v.string()), // ISO string
	}),
)
	.index("by_workspace_id", ["workspaceId"])
	.index("by_external_id", ["externalId"]);
