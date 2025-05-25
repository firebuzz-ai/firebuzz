import { v } from "convex/values";

export const brandSchema = v.object({
  // Identity
  name: v.string(),
  website: v.optional(v.string()),
  description: v.optional(v.string()),
  persona: v.optional(v.string()),
  logo: v.optional(v.string()),
  favicon: v.optional(v.string()),
  // Relations
  workspaceId: v.id("workspaces"),
  projectId: v.id("projects"),
  // System
  updatedAt: v.optional(v.string()),
  createdBy: v.id("users"),
  updatedBy: v.optional(v.id("users")),
});
