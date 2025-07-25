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

		// Create landing page
		const landingPageId = await ctx.db.insert("landingPages", {
			...args,
			createdBy: user._id,
			updatedAt: Date.now(),
			workspaceId: user.currentWorkspaceId,
			status: "draft",
			isPublished: false,
			isArchived: false,
		});

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
			title: parentLandingPage.title,
			description: parentLandingPage.description,
			workspaceId: user.currentWorkspaceId,
			isArchived: false,
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

export const publish = mutationWithTrigger({
	args: {
		html: v.string(),
		js: v.string(),
		css: v.string(),
		id: v.id("landingPages"),
	},
	handler: async (ctx, { id, html, js, css }) => {
		await getCurrentUserWithWorkspace(ctx);

		await ctx.db.patch(id, {
			status: "published",
			isPublished: true,
			publishedAt: new Date().toISOString(),
		});

		await retrier.run(
			ctx,
			internal.collections.landingPages.actions.storeInKV,
			{
				key: id,
				html,
				js,
				css,
			},
		);
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
			previewPublishedAt: new Date().toISOString(),
			previewUrl: `${process.env.PREVIEW_URL}/${id}`,
		});

		await retrier.run(
			ctx,
			internal.collections.landingPages.actions.storeInKV,
			{
				key: `preview-${id}`,
				html,
				js,
				css,
			},
		);
	},
});

export const publishToCustomDomain = mutationWithTrigger({
	args: {
		id: v.id("landingPages"),
		domainId: v.id("domains"),
		html: v.string(),
		js: v.string(),
		css: v.string(),
	},
	handler: async (ctx, { id, domainId, html, js, css }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		// Get the landing page to access projectId and campaignId
		const landingPage = await ctx.db.get(id);
		if (!landingPage) {
			throw new ConvexError("Landing page not found");
		}

		// Verify user has access to this landing page
		if (landingPage.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		// Get the campaign to access the slug
		const campaign = await ctx.db.get(landingPage.campaignId);
		if (!campaign) {
			throw new ConvexError("Campaign not found");
		}

		// Get and verify the domain
		const domain = await ctx.db.get(domainId);
		if (!domain) {
			throw new ConvexError("Domain not found");
		}

		// Verify user has access to this domain
		if (domain.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		// Verify domain is active
		if (domain.status !== "active") {
			throw new ConvexError("Domain is not active");
		}

		// Update landing page with custom domain publish info
		await ctx.db.patch(id, {
			status: "published",
			isPublished: true,
			publishedAt: new Date().toISOString(),
			customDomainId: domainId,
			customDomainUrl: `https://${domain.hostname}/${campaign.slug}`,
		});

		// Store in KV using production format with campaign slug: production-${projectId}-${campaignSlug}
		await retrier.run(
			ctx,
			internal.collections.landingPages.actions.storeInKV,
			{
				key: `production-${landingPage.projectId}-${campaign.slug}`,
				html,
				js,
				css,
			},
		);
	},
});

export const unpublishFromCustomDomain = mutationWithTrigger({
	args: {
		id: v.id("landingPages"),
	},
	handler: async (ctx, { id }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		// Get the landing page to access projectId and verify access
		const landingPage = await ctx.db.get(id);
		if (!landingPage) {
			throw new ConvexError("Landing page not found");
		}

		// Verify user has access to this landing page
		if (landingPage.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		// Update landing page to remove custom domain info
		await ctx.db.patch(id, {
			customDomainId: undefined,
			customDomainUrl: undefined,
			// Note: We keep status as "published" and isPublished as true if there are other publications
			// Only set to draft if this was the only publication
			...(!landingPage.previewPublishedAt && {
				status: "draft" as const,
				isPublished: false,
				publishedAt: undefined,
			}),
		});

		// TODO: Remove assets from KV store
		// This would require an action to delete from the engine KV store
		// const campaign = await ctx.db.get(landingPage.campaignId);
		// await retrier.run(
		//   ctx,
		//   internal.collections.landingPages.actions.removeFromKV,
		//   {
		//     key: `production-${landingPage.projectId}-${campaign.slug}`,
		//   }
		// );
	},
});
