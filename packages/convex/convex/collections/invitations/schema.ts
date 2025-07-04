import { v } from "convex/values";

export const invitationSchema = v.object({
	email: v.string(),
	externalId: v.string(),
	organizationExternalId: v.string(),
	status: v.union(
		v.literal("pending"),
		v.literal("accepted"),
		v.literal("revoked"),
	),
	role: v.union(v.literal("org:admin"), v.literal("org:member")),
	// Realtions
	invitedBy: v.id("users"),
	workspaceId: v.id("workspaces"),
	updatedAt: v.string(), // ISO string
});
