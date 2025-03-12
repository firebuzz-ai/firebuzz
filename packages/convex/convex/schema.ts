import { defineSchema, defineTable } from "convex/server";
import { campaignSchema } from "./collections/campaigns/schema";
import { landingPageMessagesSchema } from "./collections/landingPageMessages/schema";
import { landingPageTemplatesSchema } from "./collections/landingPageTemplates/schema";
import { landingPageVersionsSchema } from "./collections/landingPageVersions/schema";
import { landingPagesSchema } from "./collections/landingPages/schema";
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
    .searchIndex("by_title", { searchField: "title" }),
  landingPageTemplates: defineTable(landingPageTemplatesSchema).index(
    "by_title",
    ["title"]
  ),
  landingPages: defineTable(landingPagesSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_campaign_id", ["campaignId"])
    .searchIndex("by_title", { searchField: "title" }),
  landingPageVersions: defineTable(landingPageVersionsSchema)
    .index("by_landing_page_id", ["landingPageId"])
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_campaign_id", ["campaignId"]),
  landingPageMessages: defineTable(landingPageMessagesSchema)
    .index("by_landing_page_id", ["landingPageId"])
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_campaign_id", ["campaignId"]),
});
