import { ConvexError, v } from "convex/values";
import { internal } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";
import { retrier } from "../../../components/actionRetrier";
import { r2 } from "../../../components/r2";
import { mutationWithTrigger } from "../../../triggers";
import { getCurrentUserWithWorkspace } from "../../users/utils";
import { createInternal } from "./utils";

export const create = mutationWithTrigger({
  args: {
    landingPageId: v.id("landingPages"),
    messageId: v.optional(v.string()),
    filesString: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    const landingPage = await ctx.db.get(args.landingPageId);

    if (!landingPage) {
      throw new ConvexError("Landing page not found");
    }

    if (landingPage.workspaceId !== user.currentWorkspaceId) {
      throw new ConvexError("Unauthorized");
    }

    const { landingPageVersionId, number } = await createInternal(ctx, {
      landingPageId: args.landingPageId,
      filesString: args.filesString,
      userId: user._id,
      workspaceId: user.currentWorkspaceId,
      projectId: landingPage.projectId,
      campaignId: landingPage.campaignId,
      messageId: args.messageId,
    });

    return {
      landingPageVersionId,
      number,
    };
  },
});

export const updateCurrentVersionFiles = mutation({
  args: {
    landingPageId: v.id("landingPages"),
    filesString: v.string(),
  },
  handler: async (ctx, { landingPageId, filesString }) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    const landingPage = await ctx.db.get(landingPageId);

    if (!landingPage) {
      throw new ConvexError("Landing page not found");
    }

    if (landingPage.workspaceId !== user.currentWorkspaceId) {
      throw new ConvexError("Unauthorized");
    }

    if (!landingPage.landingPageVersionId) {
      throw new ConvexError("Landing page version not found");
    }

    // Get the landing page version
    const landingPageVersion = await ctx.db.get(
      landingPage.landingPageVersionId
    );

    if (!landingPageVersion || !landingPageVersion.key) {
      throw new ConvexError("Landing page version not found");
    }

    // Delete the files from R2
    await r2.deleteObject(ctx, landingPageVersion.key);

    // Update the files in R2
    await retrier.run(
      ctx,
      internal.collections.landingPages.versions.actions.store,
      {
        key: landingPageVersion.key,
        filesString: filesString,
      }
    );
  },
});

export const deletePermanent = mutationWithTrigger({
  args: {
    id: v.id("landingPageVersions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    const landingPageVersion = await ctx.db.get(args.id);

    if (!landingPageVersion) {
      throw new ConvexError("Landing page version not found");
    }

    if (landingPageVersion.workspaceId !== user.currentWorkspaceId) {
      throw new ConvexError("Unauthorized");
    }

    await ctx.db.delete(args.id);

    // Delete the files from R2
    await r2.deleteObject(
      ctx,
      `landing-page-versions/${landingPageVersion.landingPageId}/${landingPageVersion._id}.txt`
    );
  },
});
