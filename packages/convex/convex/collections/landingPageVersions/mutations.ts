import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import { aggregateLandingPageVersions } from "../../aggregates";
import { r2 } from "../../helpers/r2";
import { mutationWithTrigger } from "../../triggers";
import { getCurrentUser } from "../users/utils";

export const createLandingPageVersion = mutationWithTrigger({
  args: {
    landingPageId: v.id("landingPages"),
    files: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const landingPage = await ctx.db.get(args.landingPageId);

    if (!landingPage) {
      throw new ConvexError("Landing page not found");
    }

    if (landingPage.workspaceId !== user.currentWorkspaceId) {
      throw new ConvexError("Unauthorized");
    }

    // Check last count of landing page versions
    const lastCount = await aggregateLandingPageVersions.count(ctx, {
      namespace: args.landingPageId,
      // @ts-ignore
      bounds: {},
    });

    // Create the landing page version
    const landingPageVersion = await ctx.db.insert("landingPageVersions", {
      number: lastCount + 1,
      createdBy: user._id,
      workspaceId: landingPage.workspaceId,
      projectId: landingPage.projectId,
      campaignId: landingPage.campaignId,
      landingPageId: landingPage._id,
    });

    // Update the landing page version
    await ctx.db.patch(landingPage._id, {
      landingPageVersionId: landingPageVersion,
    });

    // Store the files in R2
    await ctx.scheduler.runAfter(0, internal.helpers.storage.storeStringInR2, {
      string: args.files,
      key: `landing-page-versions/${landingPage._id}/${landingPageVersion}.txt`,
      metadata: {
        landingPageId: landingPage._id,
        landingPageVersionId: landingPageVersion,
        workspaceId: user.currentWorkspaceId,
        projectId: landingPage.projectId,
        campaignId: landingPage.campaignId,
      },
    });

    return landingPageVersion;
  },
});

export const deleteLandingPageVersion = mutationWithTrigger({
  args: {
    id: v.id("landingPageVersions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

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
