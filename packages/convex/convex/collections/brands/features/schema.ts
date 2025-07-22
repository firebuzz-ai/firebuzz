import { defineTable } from "convex/server";
import { v } from "convex/values";

export const featureSchema = defineTable(
  v.object({
    name: v.string(),
    description: v.string(),
    benefits: v.string(),
    proof: v.string(),
    // Relations
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    brandId: v.id("brands"),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
    // System
    updatedAt: v.optional(v.string()),
  })
)
  .index("by_workspace_id", ["workspaceId"])
  .index("by_project_id", ["projectId"])
  .index("by_brand_id", ["brandId"]);
