import { v } from "convex/values";

export const memberSchema = v.object({
	externalId: v.string(),
	role: v.union(v.literal("admin"), v.literal("member")),
	// Relations
	workspaceId: v.id("workspaces"),
	userId: v.id("users"),
	// Clerk Relations
	userExternalId: v.string(),
	organizationExternalId: v.string(),
	updatedAt: v.string(), // ISO string
});
