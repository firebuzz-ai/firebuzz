import { v } from "convex/values";

export const landingPagesSchema = v.object({
  title: v.string(),
  description: v.string(),
  slug: v.string(),
  // Relations
  projectId: v.id("projects"),
  workspaceId: v.id("workspaces"),
  createdBy: v.id("users"),
  // System
  updatedAt: v.number(),
});
