import { v } from "convex/values";

export const featureSchema = v.object({
	name: v.string(),
	description: v.string(),
	benefits: v.string(),
	proof: v.string(),
	// Relations
	workspaceId: v.id("workspaces"),
	projectId: v.id("projects"),
	brandId: v.id("brands"),
	createdBy: v.id("users"),
	updatedBy: v.optional(v.id("users")),
	// System
	updatedAt: v.optional(v.string()),
});
