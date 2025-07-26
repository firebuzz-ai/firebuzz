import { defineTable } from "convex/server";
import { v } from "convex/values";

export const nodeSchema = v.object({
	id: v.string(),
	type: v.optional(v.string()),
	position: v.object({
		x: v.number(),
		y: v.number(),
	}),
	dragging: v.optional(v.boolean()),
	selected: v.optional(v.boolean()),
	parentId: v.optional(v.string()),
	measured: v.optional(
		v.object({
			width: v.optional(v.number()),
			height: v.optional(v.number()),
		}),
	),
	data: v.record(v.string(), v.any()),
	dragHandle: v.optional(v.string()),
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	initialWidth: v.optional(v.number()),
	initialHeight: v.optional(v.number()),
	zIndex: v.optional(v.number()),
	handles: v.optional(v.array(v.any())),
});

export const edgeSchema = v.object({
	id: v.string(),
	source: v.string(),
	target: v.string(),
	type: v.optional(v.string()),
	animated: v.optional(v.boolean()),
	selected: v.optional(v.boolean()),
	data: v.optional(v.any()),
});

export const campaignSchema = defineTable(
	v.object({
		title: v.string(),
		description: v.optional(v.string()),
		slug: v.string(),
		type: v.union(v.literal("lead-generation"), v.literal("click-through")),
		status: v.union(
			v.literal("draft"),
			v.literal("published"),
			v.literal("cancelled"),
			v.literal("finished"),
		),
		config: v.record(v.string(), v.any()),
		nodes: v.array(nodeSchema),
		edges: v.array(edgeSchema),
		// Timestamps
		updatedAt: v.optional(v.string()),
		startedAt: v.optional(v.string()),
		finishedAt: v.optional(v.string()),
		publishedAt: v.optional(v.string()),
		deletedAt: v.optional(v.string()),
		// Flags
		isPublished: v.boolean(),
		isArchived: v.boolean(),
		isFinished: v.boolean(),
		// Relations
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		createdBy: v.id("users"),
	}),
)
	.index("by_workspace_id", ["workspaceId"])
	.index("by_project_id", ["projectId"])
	.index("by_deleted_at", ["deletedAt"])
	.index("by_slug_project_id", ["slug", "projectId"])
	.searchIndex("by_title", { searchField: "title" });
