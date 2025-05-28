import { v } from "convex/values";

export const testimonialSchema = v.object({
  name: v.string(),
  avatar: v.optional(v.string()),
  title: v.optional(v.string()),
  content: v.string(),
  rating: v.optional(v.number()),

  // Search
  searchContent: v.string(),

  // Relations
  workspaceId: v.id("workspaces"),
  projectId: v.id("projects"),
  brandId: v.id("brands"),
  createdBy: v.id("users"),
  updatedBy: v.optional(v.id("users")),
  // System
  updatedAt: v.optional(v.string()),
});
