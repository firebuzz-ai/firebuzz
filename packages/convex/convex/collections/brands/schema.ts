import { v } from "convex/values";

export const seoSchema = v.object({
	metaTitleTemplate: v.optional(v.string()),
	metaTitleDivider: v.optional(
		v.union(v.literal("|"), v.literal("-"), v.literal("•"), v.literal(":")),
	),
	favicon: v.optional(v.string()),
	metaTitle: v.optional(v.string()),
	metaDescription: v.optional(v.string()),
	noIndex: v.optional(v.boolean()),
	noFollow: v.optional(v.boolean()),
	opengraph: v.optional(
		v.object({
			title: v.optional(v.string()),
			description: v.optional(v.string()),
			image: v.optional(v.string()),
			type: v.optional(v.string()),
		}),
	),
	twitterCard: v.optional(
		v.object({
			title: v.optional(v.string()),
			description: v.optional(v.string()),
			image: v.optional(v.string()),
			type: v.optional(v.string()),
		}),
	),
});

export const brandSchema = v.object({
	// Identity
	name: v.string(),
	website: v.optional(v.string()),
	description: v.optional(v.string()),
	persona: v.optional(v.string()),
	// Contact
	phone: v.optional(v.string()),
	email: v.optional(v.string()),
	address: v.optional(v.string()),
	// Visuals
	logo: v.optional(v.string()),
	logoDark: v.optional(v.string()),
	icon: v.optional(v.string()),
	iconDark: v.optional(v.string()),

	// SEO
	seo: v.optional(seoSchema),
	// Relations
	workspaceId: v.id("workspaces"),
	projectId: v.id("projects"),
	defaultThemeId: v.optional(v.id("themes")),
	// System
	updatedAt: v.optional(v.string()),
	createdBy: v.id("users"),
	updatedBy: v.optional(v.id("users")),
});
