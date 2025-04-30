import { v } from "convex/values";

export const mediaSchema = v.object({
  key: v.string(),
  name: v.string(),
  size: v.number(),
  contentType: v.string(),
  type: v.union(v.literal("image"), v.literal("video"), v.literal("audio")),
  source: v.union(
    v.literal("ai-generated"),
    v.literal("uploaded"),
    v.literal("unsplash"),
    v.literal("pexels")
  ),
  description: v.optional(v.string()),
  aiMetadata: v.optional(
    v.object({
      prompt: v.string(),
      size: v.string(),
      quality: v.string(),
    })
  ),
  // Relations
  workspaceId: v.id("workspaces"),
  projectId: v.id("projects"),
  createdBy: v.id("users"),
  isArchived: v.optional(v.boolean()),
  deletedAt: v.optional(v.string()),
});
