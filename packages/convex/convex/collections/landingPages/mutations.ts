import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { retrier } from "../../helpers/retrier";
import {
  internalMutationWithTrigger,
  mutationWithTrigger,
} from "../../triggers";
import { getCurrentUser } from "../users/utils";
import { createInternal } from "./versions/utils";

export const create = mutationWithTrigger({
  args: {
    title: v.string(),
    projectId: v.id("projects"),
    campaignId: v.id("campaigns"),
    templateId: v.id("landingPageTemplates"),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUser(ctx);

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
      filesString: template.files,
      workspaceId: user.currentWorkspaceId,
      projectId: args.projectId,
      campaignId: args.campaignId,
      messageId: undefined,
    });

    return landingPageId;
  },
});

export const update = mutation({
  args: {
    id: v.id("landingPages"),
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

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
    await getCurrentUser(ctx);
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
    await getCurrentUser(ctx);
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
    await getCurrentUser(ctx);
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
    await getCurrentUser(ctx);

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
      }
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
    await getCurrentUser(ctx);

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
      }
    );
  },
});
