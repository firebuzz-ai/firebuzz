import { asyncMap } from "convex-helpers";
import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { retrier } from "../../components/actionRetrier";
import {
	internalMutationWithTrigger,
	mutationWithTrigger,
} from "../../triggers";
import { getCurrentUserWithWorkspace } from "../users/utils";
import { applyBrandAssetsToTemplate } from "./helpers/brand";
import { applyCampaignToTemplate } from "./helpers/campaign";
import { applySeoToTemplate } from "./helpers/seo";
import { applyThemeToTemplate } from "./helpers/theme";
import { createInternal } from "./versions/utils";

export const create = mutationWithTrigger({
	args: {
		title: v.string(),
		projectId: v.id("projects"),
		campaignId: v.id("campaigns"),
		templateId: v.id("landingPageTemplates"),
		themeId: v.id("themes"),
	},
	handler: async (ctx, args) => {
		// Get current user
		const user = await getCurrentUserWithWorkspace(ctx);
		// Check template exists
		const template = await ctx.db.get(args.templateId);

		if (!template) {
			throw new ConvexError("Template not found");
		}

		// Check campaign exists
		const campaign = await ctx.db.get(args.campaignId);

		if (!campaign) {
			throw new ConvexError("Campaign not found");
		}

		// Get form if campaign is lead-generation
		const form =
			campaign.type === "lead-generation"
				? await ctx.db
						.query("forms")
						.withIndex("by_campaign_id", (q) =>
							q.eq("campaignId", args.campaignId),
						)
						.first()
				: null;

		// Get theme
		const theme = await ctx.db.get(args.themeId);
		if (!theme) {
			throw new ConvexError("Theme not found");
		}

		// Get Brand
		const brand = await ctx.db
			.query("brands")
			.withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
			.first();

		if (!brand) {
			throw new ConvexError("Brand not found");
		}

		// Create landing page
		const landingPageId = await ctx.db.insert("landingPages", {
			...args,
			createdBy: user._id,
			updatedAt: Date.now(),
			workspaceId: user.currentWorkspaceId,
			status: "draft",
			isPublished: false,
			isArchived: false,
			language: campaign.primaryLanguage,
			isChampion: true, // True by default
		});

		// Apply customizations to template in sequence
		// 1. Apply theme (colors, fonts, CSS)
		const themedTemplateFiles = applyThemeToTemplate(template.files, theme);

		// 2. Apply campaign configuration
		const campaignTemplateFiles = applyCampaignToTemplate(
			themedTemplateFiles,
			campaign,
			form,
		);

		// 3. Apply SEO configuration
		const seoTemplateFiles = applySeoToTemplate(campaignTemplateFiles, brand);

		// 4. Apply brand assets (logos, icons)
		const finalTemplateFiles = applyBrandAssetsToTemplate(
			seoTemplateFiles,
			brand,
		);

		// Create landing page version
		await createInternal(ctx, {
			userId: user._id,
			landingPageId,
			filesString: finalTemplateFiles,
			workspaceId: user.currentWorkspaceId,
			projectId: args.projectId,
			campaignId: args.campaignId,
			messageId: undefined,
		});

		return landingPageId;
	},
});

export const createVariant = mutationWithTrigger({
	args: {
		parentId: v.id("landingPages"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		// Check parent landing page exists
		const parentLandingPage = await ctx.db.get(args.parentId);

		if (!parentLandingPage) {
			throw new ConvexError("Parent landing page not found");
		}

		// Check campaign exists
		const campaign = await ctx.db.get(parentLandingPage.campaignId);

		if (!campaign) {
			throw new ConvexError("Campaign not found");
		}

		if (!parentLandingPage.landingPageVersionId) {
			throw new ConvexError("Parent landing page version not found");
		}

		// Get parent landing page version
		const parentLandingPageVersion = await ctx.db.get(
			parentLandingPage.landingPageVersionId,
		);

		if (!parentLandingPageVersion) {
			throw new ConvexError("Parent landing page version not found");
		}

		// Check variants count
		const existingVariants = await ctx.db
			.query("landingPages")
			.withIndex("by_parent_id", (q) => q.eq("parentId", args.parentId))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.collect();

		// Create New Variant
		const variantId = await ctx.db.insert("landingPages", {
			parentId: args.parentId,
			createdBy: user._id,
			updatedAt: Date.now(),
			status: "draft",
			isPublished: false,
			projectId: parentLandingPage.projectId,
			campaignId: parentLandingPage.campaignId,
			templateId: parentLandingPage.templateId,
			themeId: parentLandingPage.themeId,
			title: `${parentLandingPage.title} [V${existingVariants.length + 1}]`,
			description: parentLandingPage.description,
			workspaceId: user.currentWorkspaceId,
			isArchived: false,
			isChampion: false, // False by default since it's a variant
		});

		// Create landing page version
		const landingPageVersionId = await ctx.db.insert("landingPageVersions", {
			landingPageId: variantId,
			createdBy: user._id,
			workspaceId: parentLandingPageVersion.workspaceId,
			number: 0,
			projectId: parentLandingPage.projectId,
			campaignId: parentLandingPage.campaignId,
			messageId: undefined,
			key: parentLandingPageVersion.key,
		});

		// Update landing page with landing page version id
		await ctx.db.patch(variantId, {
			landingPageVersionId,
		});

		return variantId;
	},
});

// Create a translation of an existing landing page with a required language
export const createTranslation = mutationWithTrigger({
	args: {
		originalId: v.id("landingPages"),
		language: v.string(),
		description: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const original = await ctx.db.get(args.originalId);
		if (!original) throw new ConvexError("Original landing page not found");
		if (original.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		// Prevent duplicates: check if a non-archived, non-deleted translation for this language already exists
		const existing = await ctx.db
			.query("landingPages")
			.withIndex("by_original_id", (q) => q.eq("originalId", original._id))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.filter((q) => q.eq(q.field("isArchived"), false))
			.filter((q) => q.eq(q.field("language"), args.language))
			.first();

		if (existing) {
			throw new ConvexError("A translation for this language already exists");
		}

		// Ensure original has a version to derive initial content from
		if (!original.landingPageVersionId) {
			throw new ConvexError("Original landing page version not found");
		}
		const originalVersion = await ctx.db.get(original.landingPageVersionId);
		if (!originalVersion || !originalVersion.key) {
			throw new ConvexError("Original landing page version not found");
		}

		// Create translation landing page (same base attributes as original)
		const translationId = await ctx.db.insert("landingPages", {
			title: original.title,
			description: args.description || original.description,
			status: "draft" as const,
			isPublished: false,
			isArchived: false,
			workspaceId: original.workspaceId,
			projectId: original.projectId,
			campaignId: original.campaignId,
			templateId: original.templateId,
			themeId: original.themeId,
			createdBy: user._id,
			updatedAt: Date.now(),
			originalId: original._id,
			parentId: original.parentId,
			language: args.language,
			isChampion: false, // False by default since it's a translation
		});

		// Create a landing page version for the translation using original's key
		const landingPageVersionId = await ctx.db.insert("landingPageVersions", {
			landingPageId: translationId,
			createdBy: user._id,
			workspaceId: original.workspaceId,
			number: 0,
			projectId: original.projectId,
			campaignId: original.campaignId,
			messageId: undefined,
			key: originalVersion.key,
		});

		// Patch translation with version id
		await ctx.db.patch(translationId, {
			landingPageVersionId,
		});

		return translationId;
	},
});

export const update = mutation({
	args: {
		id: v.id("landingPages"),
		title: v.string(),
		description: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		// Check same workspace
		const landingPage = await ctx.db.get(args.id);

		if (!landingPage) {
			throw new ConvexError("Landing page not found");
		}

		if (landingPage.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("You are not allowed to update this landing page");
		}

		await ctx.db.patch(args.id, {
			title: args.title,
			description: args.description,
			updatedAt: Date.now(),
		});
	},
});

export const updateLandingPageVersion = mutation({
	args: {
		id: v.id("landingPages"),
		landingPageVersionId: v.id("landingPageVersions"),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.id, {
			landingPageVersionId: args.landingPageVersionId,
		});
	},
});

export const archive = mutationWithTrigger({
	args: {
		id: v.id("landingPages"),
	},
	handler: async (ctx, { id }) => {
		await getCurrentUserWithWorkspace(ctx);
		await ctx.db.patch(id, {
			isArchived: true,
		});
	},
});

export const restore = mutationWithTrigger({
	args: {
		id: v.id("landingPages"),
	},
	handler: async (ctx, { id }) => {
		await getCurrentUserWithWorkspace(ctx);
		await ctx.db.patch(id, {
			isArchived: false,
		});
	},
});

export const deleteInternal = internalMutationWithTrigger({
	args: {
		id: v.id("landingPages"),
	},
	handler: async (ctx, { id }) => {
		try {
			await ctx.db.delete(id);
		} catch (error) {
			console.error(error);
		}
	},
});

export const deleteTemporary = mutationWithTrigger({
	args: {
		id: v.id("landingPages"),
	},
	handler: async (ctx, { id }) => {
		await getCurrentUserWithWorkspace(ctx);
		await ctx.db.patch(id, {
			deletedAt: new Date().toISOString(),
		});
	},
});

export const deletePermanent = internalMutationWithTrigger({
	args: {
		id: v.id("landingPages"),
	},
	handler: async (ctx, { id }) => {
		await ctx.db.delete(id);
	},
});

export const publishPreview = mutationWithTrigger({
	args: {
		id: v.id("landingPages"),
		html: v.string(),
		js: v.string(),
		css: v.string(),
	},
	handler: async (ctx, { id, html, js, css }) => {
		await getCurrentUserWithWorkspace(ctx);

		await ctx.db.patch(id, {
			status: "published",
			previewPublishedAt: new Date().toISOString(),
			previewUrl: `${process.env.PREVIEW_URL}/landing/${id}`,
		});

		const key = `landing:preview:${id}`;

		await retrier.run(
			ctx,
			internal.collections.landingPages.actions.storeInKV,
			{
				key,
				html,
				js,
				css,
			},
		);
	},
});

export const promoteToChampion = mutationWithTrigger({
	args: {
		id: v.id("landingPages"),
	},
	handler: async (ctx, { id }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const landingPage = await ctx.db.get(id);
		if (!landingPage) throw new ConvexError("Landing page not found");
		if (landingPage.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		// Check if this is current champion
		if (landingPage.isChampion) {
			return; // Already champion
		}

		// Get all variants
		if (landingPage.parentId) {
			const variants = await ctx.db
				.query("landingPages")
				.withIndex("by_parent_id", (q) =>
					q.eq("parentId", landingPage.parentId),
				)
				.collect();

			const parent = await ctx.db.get(landingPage.parentId);
			if (parent) variants.push(parent);

			// Make all variants non-champion
			await asyncMap(variants, async (variant) => {
				if (variant._id === id) {
					// Make current variant champion
					await ctx.db.patch(variant._id, {
						isChampion: true,
						parentId: undefined,
					});
				}

				// Make all other variants non-champion
				else {
					await ctx.db.patch(variant._id, {
						isChampion: false,
						parentId: id,
					});
					return;
				}
			});
		}
	},
});
