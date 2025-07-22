import { defineTable } from "convex/server";
import { v } from "convex/values";

export const landingPageVersionsSchema = defineTable(
  v.object({
    number: v.number(),
    messageId: v.optional(v.string()),
    key: v.optional(v.string()),
    // Relations
    createdBy: v.id("users"),
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    campaignId: v.id("campaigns"),
    landingPageId: v.id("landingPages"),
  })
)
  .index("by_landing_page_id", ["landingPageId"])
  .index("by_workspace_id", ["workspaceId"])
  .index("by_project_id", ["projectId"])
  .index("by_campaign_id", ["campaignId"])
  .index("by_message_id", ["messageId"]);
