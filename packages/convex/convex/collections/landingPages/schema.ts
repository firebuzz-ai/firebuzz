import { type Infer, v } from "convex/values";

export const landingPagesSchema = v.object({
	title: v.string(),
	description: v.optional(v.string()),
	status: v.union(v.literal("draft"), v.literal("published")),
	isPublished: v.boolean(),
	isArchived: v.boolean(),
	deletedAt: v.optional(v.string()),
	publishedAt: v.optional(v.string()),
	previewPublishedAt: v.optional(v.string()),
	previewUrl: v.optional(v.string()),
	customDomainId: v.optional(v.id("domains")),
	customDomainUrl: v.optional(v.string()),
	// Relations
	workspaceId: v.id("workspaces"),
	projectId: v.id("projects"),
	campaignId: v.id("campaigns"),
	originalId: v.optional(v.id("landingPages")), // For translations
	parentId: v.optional(v.id("landingPages")), // For Variants
	templateId: v.id("landingPageTemplates"),
	landingPageVersionId: v.optional(v.id("landingPageVersions")),
	createdBy: v.id("users"),
	// System
	updatedAt: v.number(),
});

export type LandingPageStatus = "draft" | "published";
export type LandingPage = Infer<typeof landingPagesSchema>;
