import { ConvexError, v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getCurrentUser } from "../users/utils";
import { landingPageMessagesSchema } from "./schema";
export const createLandingPageMessage = mutation({
  args: {
    landingPageId: v.id("landingPages"),
    message: v.string(),
    type: landingPageMessagesSchema.fields.role,
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

    await ctx.db.insert("landingPageMessages", {
      landingPageId: args.landingPageId,
      message: args.message,
      role: args.type,
      workspaceId: user.currentWorkspaceId,
      projectId: landingPage.projectId,
      campaignId: landingPage.campaignId,
    });
  },
});
