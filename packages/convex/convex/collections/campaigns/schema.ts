import { defineTable } from "convex/server";
import { v } from "convex/values";
import { edgeDataSchema, nodeDataSchema } from "./nodeSchemas";

export const edgeSchema = v.object({
	id: v.string(),
	source: v.string(),
	target: v.string(),
	type: v.optional(v.string()),
	animated: v.optional(v.boolean()),
	hidden: v.optional(v.boolean()),
	selected: v.optional(v.boolean()),
	data: v.optional(edgeDataSchema),
});

export const viewportSchema = v.object({
	x: v.number(),
	y: v.number(),
	zoom: v.number(),
});

export const nodeSchema = v.object({
	id: v.string(),
	type: v.optional(v.string()),
	position: v.object({
		x: v.number(),
		y: v.number(),
	}),
	resizing: v.optional(v.boolean()),
	dragging: v.optional(v.boolean()),
	selected: v.optional(v.boolean()),
	hidden: v.optional(v.boolean()),
	parentId: v.optional(v.string()),
	measured: v.optional(
		v.object({
			width: v.optional(v.number()),
			height: v.optional(v.number()),
		}),
	),
	data: nodeDataSchema,
	dragHandle: v.optional(v.string()),
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	initialWidth: v.optional(v.number()),
	initialHeight: v.optional(v.number()),
	zIndex: v.optional(v.number()),
	handles: v.optional(v.array(v.any())),
});

export const goalSchema = v.object({
	id: v.string(),
	title: v.string(),
	description: v.optional(v.string()),
	direction: v.union(v.literal("up"), v.literal("down")),
	placement: v.union(v.literal("internal"), v.literal("external")),
	value: v.number(),
	currency: v.optional(v.string()),
	type: v.union(v.literal("conversion"), v.literal("engagement")),
	isCustom: v.boolean(),
});

export const campaignSchema = defineTable(
	v.object({
		title: v.string(),
		description: v.optional(v.string()),
		slug: v.string(),
		type: v.union(v.literal("lead-generation"), v.literal("click-through")),
		status: v.union(
			v.literal("draft"),
			v.literal("preview"),
			v.literal("scheduled"),
			v.literal("published"),
			v.literal("completed"),
		),
		primaryLanguage: v.string(),
		// Canvas data as separate columns
		nodes: v.array(nodeSchema),
		edges: v.array(edgeSchema),
		viewport: viewportSchema,
		// Campaign Settings
		campaignSettings: v.object({
			primaryGoal: goalSchema,
			customGoals: v.optional(v.array(goalSchema)),
			sessionDuration: v.number(),
			attributionPeriod: v.number(),
		}),
		// Timestamps
		updatedAt: v.optional(v.string()),
		startedAt: v.optional(v.string()),
		completedAt: v.optional(v.string()),
		publishedAt: v.optional(v.string()),
		previewPublishedAt: v.optional(v.string()),
		deletedAt: v.optional(v.string()),
		scheduledAt: v.optional(v.string()),
		// Flags
		isPublished: v.boolean(),
		isArchived: v.boolean(),
		isCompleted: v.boolean(),
		isSaving: v.optional(v.boolean()),
		// Links
		urlConfig: v.optional(
			v.object({
				previewUrl: v.string(),
				productionUrls: v.optional(
					v.array(
						v.object({
							type: v.union(v.literal("custom"), v.literal("workspace")),
							url: v.string(),
							domainId: v.optional(v.id("domains")),
						}),
					),
				),
			}),
		),
		// Relations
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		createdBy: v.id("users"),
		lastUpdatedBy: v.optional(v.id("users")),
		scheduledId: v.optional(v.id("_scheduled_functions")),
	}),
)
	.index("by_workspace_id", ["workspaceId"])
	.index("by_project_id", ["projectId"])
	.index("by_deleted_at", ["deletedAt"])
	.index("by_slug_project_id", ["slug", "projectId"])
	.searchIndex("by_title", { searchField: "title" });
