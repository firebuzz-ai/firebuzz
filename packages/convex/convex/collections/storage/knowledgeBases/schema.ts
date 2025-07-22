import { defineTable } from "convex/server";
import { v } from "convex/values";

export const knowledgeBaseSchema = defineTable(
  v.object({
    name: v.string(),
    index: v.number(),
    description: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
    isSystem: v.boolean(),
    isVisible: v.boolean(),
    // Relations
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
  })
)
  .index("by_workspace_id", ["workspaceId"])
  .index("by_project_id", ["projectId"])
  .index("by_created_by", ["createdBy"]);
