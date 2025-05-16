import { v } from "convex/values";

export const knowledgeBaseSchema = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  updatedAt: v.optional(v.string()),
  // Relations
  workspaceId: v.id("workspaces"),
  projectId: v.id("projects"),
  createdBy: v.id("users"),
  updatedBy: v.optional(v.id("users")),
});
