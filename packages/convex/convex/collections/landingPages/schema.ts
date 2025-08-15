import { defineTable } from "convex/server";
import { v } from "convex/values";

export const landingPagesSchema = defineTable(
	v.object({
		title: v.string(),
		description: v.optional(v.string()),
		status: v.union(v.literal("draft"), v.literal("published")),
		isPublished: v.boolean(),
		isArchived: v.boolean(),
		deletedAt: v.optional(v.string()),
		publishedAt: v.optional(v.string()),
		previewPublishedAt: v.optional(v.string()),
		previewUrl: v.optional(v.string()),
		language: v.optional(v.string()),
		customDomainId: v.optional(v.id("domains")),
		customDomainUrl: v.optional(v.string()),
		// Relations
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		campaignId: v.id("campaigns"),
		originalId: v.optional(v.id("landingPages")), // For translations
		parentId: v.optional(v.id("landingPages")), // For Variants
		templateId: v.id("landingPageTemplates"),
		isChampion: v.boolean(),
		themeId: v.optional(v.id("themes")), // Theme selection
		landingPageVersionId: v.optional(v.id("landingPageVersions")),
		createdBy: v.id("users"),
		// System
		updatedAt: v.number(),
	}),
)
	.index("by_workspace_id", ["workspaceId"])
	.index("by_project_id", ["projectId"])
	.index("by_campaign_id", ["campaignId"])
	.index("by_original_id", ["originalId"])
	.index("by_parent_id", ["parentId"])
	.index("by_deleted_at", ["deletedAt"])
	.searchIndex("by_title", { searchField: "title" });

export type LandingPageStatus = "draft" | "published";
