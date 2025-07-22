import { defineTable } from "convex/server";
import { type Infer, v } from "convex/values";

export const attachmentsSchema = v.object({
  id: v.optional(v.union(v.id("documents"), v.id("media"))),
  name: v.string(),
  url: v.string(),
  contentType: v.string(),
  size: v.number(),
  isLong: v.optional(v.boolean()),
  summary: v.optional(v.string()),
});

export const landingPageMessagesSchema = defineTable(
  v.object({
    messageId: v.string(),
    groupId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    vote: v.optional(v.union(v.literal("up"), v.literal("down"))),
    createdAt: v.string(),
    parts: v.array(v.any()),
    attachments: v.optional(v.array(attachmentsSchema)),
    // Relations
    landingPageId: v.id("landingPages"),
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    campaignId: v.id("campaigns"),
  })
)
  .index("by_landing_page_id", ["landingPageId"])
  .index("by_workspace_id", ["workspaceId"])
  .index("by_project_id", ["projectId"])
  .index("by_campaign_id", ["campaignId"])
  .index("by_created_at", ["createdAt"])
  .index("by_message_id", ["messageId"]);

export type Attachment = Infer<typeof attachmentsSchema>;
