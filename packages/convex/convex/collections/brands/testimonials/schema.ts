import { defineTable } from "convex/server";
import { v } from "convex/values";

export const testimonialSchema = defineTable(
	v.object({
		name: v.string(),
		avatar: v.optional(v.string()),
		title: v.optional(v.string()),
		content: v.string(),
		rating: v.optional(v.number()),

		// Search
		searchContent: v.string(),

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
	.searchIndex("by_search_content", { searchField: "searchContent" });

export const testimonialInsertSchema = v.object({
	name: v.string(),
	avatar: v.optional(v.string()),
	title: v.optional(v.string()),
	content: v.string(),
	rating: v.optional(v.number()),
});
