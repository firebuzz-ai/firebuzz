import { defineTable } from "convex/server";
import { v } from "convex/values";

export const campaignSchema = defineTable(
  v.object({
    title: v.string(),
    description: v.optional(v.string()),
    slug: v.string(),
    type: v.union(v.literal("lead-generation"), v.literal("click-through")),
    status: v.union(
      v.literal("draft"),
      v.literal("cancelled"),
      v.literal("paused"),
      v.literal("scheduled"),
      v.literal("published"),
      v.literal("finished")
    ),
    config: v.optional(v.any()),
    // Timestamps
    updatedAt: v.optional(v.string()),
    startedAt: v.optional(v.string()),
    finishedAt: v.optional(v.string()),
    publishedAt: v.optional(v.string()),
    deletedAt: v.optional(v.string()),
    lastSaved: v.optional(v.string()),
    scheduledAt: v.optional(v.string()),
    // Flags
    isPublished: v.boolean(),
    isArchived: v.boolean(),
    isFinished: v.boolean(),
    isSaving: v.optional(v.boolean()),
    // Relations
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    createdBy: v.id("users"),
    defaultLandingPageId: v.optional(v.id("landingPages")),
  })
)
  .index("by_workspace_id", ["workspaceId"])
  .index("by_project_id", ["projectId"])
  .index("by_deleted_at", ["deletedAt"])
  .index("by_slug_project_id", ["slug", "projectId"])
  .searchIndex("by_title", { searchField: "title" });
