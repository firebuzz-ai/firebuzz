import { v } from "convex/values";

export const filesSchema = v.object({
  fileName: v.string(),
  fileType: v.union(
    v.literal("md"),
    v.literal("html"),
    v.literal("txt"),
    v.literal("pdf"),
    v.literal("csv"),
    v.literal("docx")
  ),
  fileSize: v.number(),
  key: v.string(),
  vectorizationStatus: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed")
  ),
  // Relations
  workspaceId: v.id("workspaces"),
  projectId: v.id("projects"),
  createdBy: v.id("users"),
  deletedAt: v.optional(v.string()),
  isArchived: v.optional(v.boolean()),
});
