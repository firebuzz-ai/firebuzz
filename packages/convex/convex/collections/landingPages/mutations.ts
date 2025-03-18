import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction, internalMutation } from "../../_generated/server";
import { retrier } from "../../helpers/retrier";
import {
  internalMutationWithTrigger,
  mutationWithTrigger,
} from "../../triggers";
import { getCurrentUser } from "../users/utils";

import { createClient } from "@engine/api/client";
import { createLandingPageVersionInternal } from "../landingPageVersions/utils";

const engineAPIClient = createClient(process.env.ENGINE_URL);

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
    await createLandingPageVersionInternal(ctx, {
      userId: user._id,
      landingPageId,
      filesString: template.files,
      workspaceId: user.currentWorkspaceId,
      projectId: args.projectId,
      campaignId: args.campaignId,
    });

    return landingPageId;
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
      internal.collections.landingPages.mutations.storeLandingPageFilesinKV,
      {
        key: id,
        html,
        js,
        css,
      }
    );
  },
});

export const storeLandingPageFilesinKV = internalAction({
  args: {
    key: v.string(),
    html: v.string(),
    js: v.string(),
    css: v.string(),
  },
  handler: async (_ctx, { key, html, js, css }) => {
    console.log({ token: process.env.ENGINE_SERVICE_TOKEN });
    const htmlPromise = engineAPIClient.kv.assets.$post(
      {
        json: {
          key: key,
          value: html,
          options: {
            metadata: {
              contentType: "html",
              projectId: "1",
              landingId: "1",
              variantId: "1",
              language: "en",
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ENGINE_SERVICE_TOKEN}`,
        },
      }
    );

    const jsPromise = engineAPIClient.kv.assets.$post(
      {
        json: {
          key: `${key}/assets/script`,
          value: js,
          options: {
            metadata: {
              contentType: "js",
              projectId: "1",
              landingId: "1",
              variantId: "1",
              language: "en",
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ENGINE_SERVICE_TOKEN}`,
        },
      }
    );

    const cssPromise = engineAPIClient.kv.assets.$post(
      {
        json: {
          key: `${key}/assets/styles`,
          value: css,
          options: {
            metadata: {
              contentType: "css",
              projectId: "1",
              landingId: "1",
              variantId: "1",
              language: "en",
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ENGINE_SERVICE_TOKEN}`,
        },
      }
    );

    await Promise.all([htmlPromise, jsPromise, cssPromise]);
  },
});
