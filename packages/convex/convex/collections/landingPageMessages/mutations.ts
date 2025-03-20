import { ConvexError, v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getCurrentUser } from "../users/utils";
import { landingPageMessagesSchema } from "./schema";
export const createLandingPageMessage = mutation({
  args: {
    landingPageId: v.id("landingPages"),
    message: v.string(),
    type: landingPageMessagesSchema.fields.role,
    messageId: v.string(),
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

    return await ctx.db.insert("landingPageMessages", {
      message: args.message,
      role: args.type,
      landingPageId: args.landingPageId,
      workspaceId: user.currentWorkspaceId,
      projectId: landingPage.projectId,
      campaignId: landingPage.campaignId,
      messageId: args.messageId,
    });
  },
});

export const createLandingPageMessages = mutation({
  args: {
    landingPageId: v.id("landingPages"),
    messages: v.array(
      v.object({
        id: v.string(),
        message: v.string(),
        role: landingPageMessagesSchema.fields.role,
      })
    ),
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

    const messages = args.messages.map((message) => ({
      messageId: message.id,
      message: message.message,
      role: message.role,
      landingPageId: args.landingPageId,
      workspaceId: user.currentWorkspaceId,
      projectId: landingPage.projectId,
      campaignId: landingPage.campaignId,
    }));

    await Promise.all(
      messages.map((message) => ctx.db.insert("landingPageMessages", message))
    );
  },
});
