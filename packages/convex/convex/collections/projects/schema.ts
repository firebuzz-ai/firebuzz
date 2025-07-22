import { defineTable } from "convex/server";
import { v } from "convex/values";

export const projectSchema = defineTable(
  v.object({
    title: v.string(),
    color: v.string(),
    icon: v.string(),
    // Relations
    workspaceId: v.id("workspaces"),
    createdBy: v.id("users"),
    // Flags
    isOnboarded: v.optional(v.boolean()),
  })
)
  .index("by_workspace_id", ["workspaceId"])
  .index("by_title", ["title"]);
