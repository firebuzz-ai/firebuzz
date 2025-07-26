import { defineTable } from "convex/server";
import { v } from "convex/values";

export const audienceSchema = defineTable(
	v.object({
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
		avatar: v.optional(
			v.union(
				v.literal("old-female-1"),
				v.literal("old-male-1"),
				v.literal("old-female-2"),
				v.literal("old-male-2"),
				v.literal("mid-female-1"),
				v.literal("mid-male-1"),
				v.literal("mid-female-2"),
				v.literal("mid-male-2"),
				v.literal("mid-female-3"),
				v.literal("mid-male-3"),
				v.literal("young-female-1"),
				v.literal("young-male-1"),
				v.literal("young-female-2"),
				v.literal("young-male-2"),
				v.literal("young-female-3"),
				v.literal("young-male-3"),
			),
		),
		// Relations
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		brandId: v.id("brands"),
		createdBy: v.id("users"),
		updatedBy: v.optional(v.id("users")),
		// System
		updatedAt: v.optional(v.string()),
	}),
)
	.index("by_workspace_id", ["workspaceId"])
	.index("by_project_id", ["projectId"])
	.index("by_brand_id", ["brandId"])
	.searchIndex("by_name", { searchField: "name" });

export const audienceInsertSchema = v.object({
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
	avatar: v.optional(
		v.union(
			v.literal("old-female-1"),
			v.literal("old-male-1"),
			v.literal("old-female-2"),
			v.literal("old-male-2"),
			v.literal("mid-female-1"),
			v.literal("mid-male-1"),
			v.literal("mid-female-2"),
			v.literal("mid-male-2"),
			v.literal("mid-female-3"),
			v.literal("mid-male-3"),
			v.literal("young-female-1"),
			v.literal("young-male-1"),
			v.literal("young-female-2"),
			v.literal("young-male-2"),
			v.literal("young-female-3"),
			v.literal("young-male-3"),
		),
	),
});
