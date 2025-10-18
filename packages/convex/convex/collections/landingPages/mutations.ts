import { createThread, listStreams } from "@convex-dev/agent";
import { asyncMap } from "convex-helpers";
import { ConvexError, v } from "convex/values";
import { components, internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, mutation } from "../../_generated/server";
import { retrier } from "../../components/actionRetrier";
import {
	internalMutationWithTrigger,
	mutationWithTrigger,
} from "../../triggers";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";

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

		// Create Thread
		const threadId = await createThread(ctx, components.agent, {
			userId: user._id,
			title: args.title,
		});

		// Create landing page (version will be created on first sandbox load)
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
			threadId,
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

		const title = `${parentLandingPage.title} [V${existingVariants.length + 1}]`;

		// Create Thread
		const threadId = await createThread(ctx, components.agent, {
			userId: user._id,
			title,
		});

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
			threadId,
			title,
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

		const title = `${original.title} [${args.language}]`;

		// Create Thread
		const threadId = await createThread(ctx, components.agent, {
			userId: user._id,
			title,
		});

		// Create translation landing page (same base attributes as original)
		const translationId = await ctx.db.insert("landingPages", {
			title,
			description: args.description || original.description,
			status: "draft" as const,
			isPublished: false,
			isArchived: false,
			workspaceId: original.workspaceId,
			projectId: original.projectId,
			campaignId: original.campaignId,
			templateId: original.templateId,
			themeId: original.themeId,
			threadId,
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
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		publishStatus: v.optional(
			v.union(v.literal("draft"), v.literal("published")),
		),
		landingPageVersionId: v.optional(v.id("landingPageVersions")),
		lastPublishedVersionId: v.optional(v.id("landingPageVersions")),
		isPublishing: v.optional(v.boolean()),
		isPublished: v.optional(v.boolean()),
		previewPublishedAt: v.optional(v.string()),
		previewUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		// Check same workspace
		const landingPage = await ctx.db.get(args.id);

		if (!landingPage) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (landingPage.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const updateFields: Partial<Doc<"landingPages">> = {
			updatedAt: Date.now(),
		};

		if (args.title) {
			updateFields.title = args.title;
		}

		if (args.description) {
			updateFields.description = args.description;
		}

		if (args.publishStatus) {
			updateFields.status = args.publishStatus;
		}

		if (args.landingPageVersionId) {
			updateFields.landingPageVersionId = args.landingPageVersionId;
		}

		if (args.lastPublishedVersionId) {
			updateFields.lastPublishedVersionId = args.lastPublishedVersionId;
		}

		if (args.isPublishing) {
			updateFields.isPublishing = args.isPublishing;
		}

		if (args.isPublished) {
			updateFields.isPublished = args.isPublished;
		}

		if (args.previewPublishedAt) {
			updateFields.previewPublishedAt = args.previewPublishedAt;
		}

		if (args.previewUrl) {
			updateFields.previewUrl = args.previewUrl;
		}

		await ctx.db.patch(args.id, updateFields);
	},
});

export const updateInternal = internalMutation({
	args: {
		id: v.id("landingPages"),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		publishStatus: v.optional(
			v.union(v.literal("draft"), v.literal("published")),
		),
		landingPageVersionId: v.optional(v.id("landingPageVersions")),
		lastPublishedVersionId: v.optional(v.id("landingPageVersions")),
		revertingToVersionId: v.optional(v.id("landingPageVersions")),
		isPublishing: v.optional(v.boolean()),
		isPublished: v.optional(v.boolean()),
		previewPublishedAt: v.optional(v.string()),
		previewUrl: v.optional(v.string()),
		thumbnailUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const updateFields: Partial<Doc<"landingPages">> = {
			updatedAt: Date.now(),
		};

		if (args.title) {
			updateFields.title = args.title;
		}

		if (args.description) {
			updateFields.description = args.description;
		}

		if (args.publishStatus) {
			updateFields.status = args.publishStatus;
		}

		if (args.landingPageVersionId) {
			updateFields.landingPageVersionId = args.landingPageVersionId;
		}

		if (args.lastPublishedVersionId) {
			updateFields.lastPublishedVersionId = args.lastPublishedVersionId;
		}

		if ("revertingToVersionId" in args) {
			updateFields.revertingToVersionId = args.revertingToVersionId;
		}

		if (args.isPublishing) {
			updateFields.isPublishing = args.isPublishing;
		}

		if (args.isPublished) {
			updateFields.isPublished = args.isPublished;
		}

		if (args.previewPublishedAt) {
			updateFields.previewPublishedAt = args.previewPublishedAt;
		}

		if (args.previewUrl) {
			updateFields.previewUrl = args.previewUrl;
		}

		if (args.thumbnailUrl) {
			updateFields.thumbnailUrl = args.thumbnailUrl;
		}

		await ctx.db.patch(args.id, updateFields);
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

export const publishPreviewInternal = internalMutationWithTrigger({
	args: {
		id: v.id("landingPages"),
		html: v.string(),
		js: v.string(),
		css: v.string(),
		landingPageVersionId: v.id("landingPageVersions"),
	},
	handler: async (ctx, { id, html, js, css, landingPageVersionId }) => {
		await ctx.db.patch(id, {
			status: "published",
			lastPublishedVersionId: landingPageVersionId,
			previewPublishedAt: new Date().toISOString(),
			previewUrl: `${process.env.PREVIEW_URL}/landing/${id}`,
			isPublishing: false,
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

		// Schedule screenshot capture (non-blocking)
		await ctx.scheduler.runAfter(
			1000 * 60, // 1 minute delay
			internal.lib.cloudflare.captureLandingPageScreenshot,
			{
				landingPageId: id,
				url: `${process.env.PREVIEW_URL}/landing/${id}?disableCookieBanner=true&disableFirebuzzBadge=true`,
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

export const buildAndPublishPreview = mutation({
	args: {
		id: v.id("landingPages"),
	},
	handler: async (ctx, { id }) => {
		// 1. Auth
		const user = await getCurrentUserWithWorkspace(ctx);

		// 2. Get landing page
		const landingPage = await ctx.db.get(id);

		if (!landingPage) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (landingPage.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		if (!landingPage.threadId) {
			throw new ConvexError("Landing page has no thread");
		}

		if (landingPage.isPublishing) {
			throw new ConvexError("Publish already in progress");
		}

		// 3. Get session
		const session = await ctx.db
			.query("agentSessions")
			.withIndex("by_landing_page_id", (q) => q.eq("landingPageId", id))
			.filter((q) => q.eq(q.field("status"), "active"))
			.first();

		if (!session) {
			throw new ConvexError("No active session found");
		}

		if (!session.sandboxId) {
			throw new ConvexError("Session has no sandbox");
		}

		// 4. Get sandbox
		const sandbox = await ctx.db.get(session.sandboxId);

		if (!sandbox) {
			throw new ConvexError("Sandbox not found");
		}

		if (sandbox.status !== "running") {
			throw new ConvexError("Sandbox is not running");
		}

		if (sandbox.isBuilding) {
			throw new ConvexError("Build already in progress");
		}

		const streams = await listStreams(ctx, components.agent, {
			threadId: landingPage.threadId,
			includeStatuses: ["streaming"],
		});

		const activeStreams = streams.filter(
			(stream) => stream.status === "streaming",
		);

		if (activeStreams.length > 0) {
			throw new ConvexError(
				"Agent is currently working. Please wait for it to finish.",
			);
		}

		// Set isPublishing = true at the start
		await ctx.db.patch(id, { isPublishing: true });

		// 6. Schedule build action
		await ctx.scheduler.runAfter(
			0,
			internal.collections.landingPages.actions.buildAndPublishPreview,
			{ landingPageId: id, sessionId: session._id, userId: user._id },
		);
	},
});
