import { v } from "convex/values";

export const documentType = v.union(
  v.literal("md"),
  v.literal("mdx"),
  v.literal("html"),
  v.literal("txt"),
  v.literal("pdf"),
  v.literal("csv"),
  v.literal("docx"),
  v.literal("doc")
);

export const documentsSchema = v.object({
  key: v.string(),
  name: v.string(),
  size: v.number(),
  contentType: v.string(),
  type: documentType,
  vectorizationStatus: v.union(
    v.literal("not-started"),
    v.literal("pending"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed")
  ),
  // Relations
  memories: v.array(v.id("memories")),
  workspaceId: v.id("workspaces"),
  projectId: v.id("projects"),
  createdBy: v.id("users"),
  deletedAt: v.optional(v.string()),
  isArchived: v.optional(v.boolean()),
});
