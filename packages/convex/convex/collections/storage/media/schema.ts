import { v } from "convex/values";

export const mediaSchema = v.object({
  key: v.string(),
  source: v.union(
    v.literal("ai-generated"),
    v.literal("uploaded"),
    v.literal("unsplash"),
    v.literal("pexels")
  ),
  aiMetadata: v.optional(
    v.object({
      prompt: v.string(),
      seed: v.number(),
      size: v.string(),
    })
  ),
  // Relations
  workspaceId: v.id("workspaces"),
  projectId: v.id("projects"),
  createdBy: v.id("users"),
  isArchived: v.optional(v.boolean()),
  deletedAt: v.optional(v.string()),
});
