import { ConvexError, v } from "convex/values";
import { mutation } from "../../../_generated/server";
import { getCurrentUser } from "../../users/utils";
import { landingPageMessagesSchema } from "./schema";

export const create = mutation({
  args: {
    landingPageId: v.id("landingPages"),

    messages: v.array(
      v.object({
        id: v.string(),
        groupId: v.string(),
        message: v.string(),
        role: landingPageMessagesSchema.fields.role,
        createdAt: v.string(),
        metadata: v.optional(
          v.object({
            isSystem: v.boolean(),
          })
        ),
        attachments: landingPageMessagesSchema.fields.attachments,
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
      groupId: message.groupId,
      createdAt: message.createdAt,
      landingPageId: args.landingPageId,
      workspaceId: user.currentWorkspaceId,
      projectId: landingPage.projectId,
      campaignId: landingPage.campaignId,
      attachments: message.attachments,
    }));

    await Promise.all(
      messages.map((message) => ctx.db.insert("landingPageMessages", message))
    );
  },
});
