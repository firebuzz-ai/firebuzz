import {
	campaignSettingsSchemaConvex,
	edgeSchemaConvex,
	nodeSchemaConvex,
	viewportSchemaConvex,
} from "@firebuzz/shared-types/campaign";
import { defineTable } from "convex/server";
import { v } from "convex/values";

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
		nodes: v.array(nodeSchemaConvex),
		edges: v.array(edgeSchemaConvex),
		viewport: viewportSchemaConvex,
		// Campaign Settings
		campaignSettings: campaignSettingsSchemaConvex,
		// Timestamps
		updatedAt: v.optional(v.string()),
		startedAt: v.optional(v.string()),
		completedAt: v.optional(v.string()),
		publishedAt: v.optional(v.string()),
		productionFirstPublishedAt: v.optional(v.string()),
		previewFirstPublishedAt: v.optional(v.string()),
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
							domainId: v.optional(v.id("customDomains")),
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

// React FLow Change Validators
export const nodeChangeValidator = v.any();
export const edgeChangeValidator = v.any();

// Connection validator for new edge connections
export const connectionValidator = v.object({
	source: v.string(),
	target: v.string(),
	sourceHandle: v.optional(v.string()),
	targetHandle: v.optional(v.string()),
});

// Viewport change validator
export const viewportChangeValidator = v.object({
	x: v.number(),
	y: v.number(),
	zoom: v.number(),
});
