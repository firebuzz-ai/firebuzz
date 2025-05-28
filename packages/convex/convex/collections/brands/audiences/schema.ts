import { v } from "convex/values";

export const audienceSchema = v.object({
	name: v.string(),
	description: v.string(),
	gender: v.union(v.literal("male"), v.literal("female")),
	age: v.union(
		v.literal("18-24"),
		v.literal("25-34"),
		v.literal("35-44"),
		v.literal("45-54"),
		v.literal("55-64"),
		v.literal("65+"),
	),
	goals: v.string(),
	motivations: v.string(),
	frustrations: v.string(),
	terminologies: v.array(v.string()),

	avatar: v.optional(v.string()),
	// Relations
	workspaceId: v.id("workspaces"),
	projectId: v.id("projects"),
	brandId: v.id("brands"),
	createdBy: v.id("users"),
	updatedBy: v.optional(v.id("users")),
	// System
	updatedAt: v.optional(v.string()),
});
