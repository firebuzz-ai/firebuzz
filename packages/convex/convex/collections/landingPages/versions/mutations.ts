import { ConvexError, v } from "convex/values";
import { r2 } from "../../../helpers/r2";
import { mutationWithTrigger } from "../../../triggers";
import { getCurrentUser } from "../../users/utils";
import { createInternal } from "./utils";

export const create = mutationWithTrigger({
  args: {
    landingPageId: v.id("landingPages"),
    messageId: v.string(),
    filesString: v.string(),
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

export const deletePermanent = mutationWithTrigger({
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
