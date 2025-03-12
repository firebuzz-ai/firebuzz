import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import {
  internalMutationWithTrigger,
  mutationWithTrigger,
} from "../../triggers";
import { getCurrentUser } from "../users/utils";

export const createLandingPage = mutationWithTrigger({
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
    const landingPageVersionId = await ctx.db.insert("landingPageVersions", {
      landingPageId,
      number: 1,
      createdBy: user._id,
      projectId: args.projectId,
      campaignId: args.campaignId,
      workspaceId: user.currentWorkspaceId,
    });

    // Update the landing page version
    await ctx.db.patch(landingPageVersionId, {
      landingPageId,
    });

    // Store the template files in R2
    await ctx.scheduler.runAfter(0, internal.helpers.storage.storeStringInR2, {
      string: template.files,
      key: `landing-page-versions/${landingPageId}/${landingPageVersionId}.txt`,
      metadata: {
        landingPageId,
        landingPageVersionId,
        workspaceId: user.currentWorkspaceId,
        projectId: args.projectId,
        campaignId: args.campaignId,
      },
    });
  },
});

export const updateLandingPageVersion = internalMutation({
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

export const deleteLandingPageInternal = internalMutationWithTrigger({
  args: {
    id: v.id("landingPages"),
  },
  handler: async (ctx, { id }) => {
    try {
      const landingPage = await ctx.db.get(id);

      if (!landingPage) {
        throw new ConvexError("Landing page not found");
      }

      await ctx.db.delete(id);
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to delete landing page");
    }
  },
});

export const archiveLandingPage = mutationWithTrigger({
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

export const restoreLandingPage = mutationWithTrigger({
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

export const deleteLandingPage = mutationWithTrigger({
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

export const publishLandingPage = mutationWithTrigger({
  args: {
    id: v.id("landingPages"),
  },
  handler: async (ctx, { id }) => {
    await getCurrentUser(ctx);
    await ctx.db.patch(id, {
      status: "published",
      isPublished: true,
      publishedAt: new Date().toISOString(),
    });
  },
});
