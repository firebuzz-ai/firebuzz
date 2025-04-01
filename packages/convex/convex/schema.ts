import { defineSchema, defineTable } from "convex/server";
import { campaignSchema } from "./collections/campaigns/schema";
import { landingPageMessagesSchema } from "./collections/landingPages/messages/schema";
import { landingPagesSchema } from "./collections/landingPages/schema";
import { landingPageTemplatesSchema } from "./collections/landingPages/templates/schema";
import { landingPageVersionsSchema } from "./collections/landingPages/versions/schema";
import { projectSchema } from "./collections/projects/schema";
import { userSchema } from "./collections/users/schema";
import { workspaceSchema } from "./collections/workspaces/schema";

export default defineSchema({
  users: defineTable(userSchema).index("by_external_id", ["externalId"]),
  workspaces: defineTable(workspaceSchema)
    .index("by_external_id", ["externalId"])
    .index("by_owner", ["ownerId"]),
  projects: defineTable(projectSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_title", ["title"])
    .index("by_slug", ["slug"]),
  campaigns: defineTable(campaignSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_deleted_at", ["deletedAt"])
    .searchIndex("by_title", { searchField: "title" }),
  landingPageTemplates: defineTable(landingPageTemplatesSchema).index(
    "by_title",
    ["title"]
  ),
  landingPages: defineTable(landingPagesSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_campaign_id", ["campaignId"])
    .index("by_deleted_at", ["deletedAt"])
    .searchIndex("by_title", { searchField: "title" }),
  landingPageVersions: defineTable(landingPageVersionsSchema)
    .index("by_landing_page_id", ["landingPageId"])
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_campaign_id", ["campaignId"])
    .index("by_message_id", ["messageId"]),
  landingPageMessages: defineTable(landingPageMessagesSchema)
    .index("by_landing_page_id", ["landingPageId"])
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_campaign_id", ["campaignId"])
    .index("by_created_at", ["createdAt"])
    .index("by_message_id", ["messageId"]),
});
