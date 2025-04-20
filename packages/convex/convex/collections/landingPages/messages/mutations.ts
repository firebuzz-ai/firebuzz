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
        role: landingPageMessagesSchema.fields.role,
        createdAt: v.string(),
        metadata: v.optional(
          v.object({
            isSystem: v.boolean(),
          })
        ),
        attachments: landingPageMessagesSchema.fields.attachments,
        parts: landingPageMessagesSchema.fields.parts,
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
      parts: message.parts,
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

export const upsert = mutation({
  args: {
    landingPageId: v.id("landingPages"),
    messages: v.array(
      v.object({
        id: v.string(),
        groupId: v.string(),
        role: landingPageMessagesSchema.fields.role,
        createdAt: v.string(),
        metadata: v.optional(
          v.object({
            isSystem: v.boolean(),
          })
        ),
        attachments: landingPageMessagesSchema.fields.attachments,
        parts: landingPageMessagesSchema.fields.parts,
        isRevision: v.boolean(),
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
      parts: message.parts,
      role: message.role,
      groupId: message.groupId,
      createdAt: message.createdAt,
      landingPageId: args.landingPageId,
      workspaceId: user.currentWorkspaceId,
      projectId: landingPage.projectId,
      campaignId: landingPage.campaignId,
      attachments: message.attachments,
      isRevision: message.isRevision,
    }));

    const messageWithRevisionId = messages.find(
      (message) => message.isRevision
    );

    // Revision
    if (messageWithRevisionId) {
      // Fetch last assistant message
      const lastAssistantMessage = await ctx.db
        .query("landingPageMessages")
        .withIndex("by_landing_page_id", (q) =>
          q.eq("landingPageId", args.landingPageId)
        )
        .filter((q) => q.eq(q.field("role"), "assistant"))
        .order("desc")
        .first();

      if (!lastAssistantMessage) {
        throw new ConvexError("No assistant message found");
      }

      // Update last assistant message with revision parts
      await ctx.db.patch(lastAssistantMessage._id, {
        parts: messageWithRevisionId.parts,
        messageId: messageWithRevisionId.messageId,
      });
    } else {
      await Promise.all(
        messages.map((message) =>
          ctx.db.insert("landingPageMessages", {
            messageId: message.messageId,
            parts: message.parts,
            role: message.role,
            groupId: message.groupId,
            createdAt: message.createdAt,
            landingPageId: message.landingPageId,
            workspaceId: message.workspaceId,
            projectId: message.projectId,
            campaignId: message.campaignId,
            attachments: message.attachments,
          })
        )
      );
    }
  },
});

export const updateWithPartsMessageId = mutation({
  args: {
    messageId: v.string(),
    parts: landingPageMessagesSchema.fields.parts,
  },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("landingPageMessages")
      .withIndex("by_message_id", (q) => q.eq("messageId", args.messageId))
      .first();
    if (!message) {
      throw new ConvexError("Message not found");
    }

    await ctx.db.patch(message._id, {
      parts: args.parts,
    });
  },
});
