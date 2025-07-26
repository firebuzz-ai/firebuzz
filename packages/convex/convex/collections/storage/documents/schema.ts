import { defineTable } from "convex/server";
import { v } from "convex/values";

export const documentType = v.union(
	v.literal("md"),
	v.literal("html"),
	v.literal("txt"),
	v.literal("pdf"),
	v.literal("csv"),
	v.literal("docx"),
	v.literal("json"),
);

export const documentsSchema = defineTable(
	v.object({
		key: v.string(),
		name: v.string(),
		summary: v.optional(v.string()),
		title: v.optional(v.string()),
		isLongDocument: v.optional(v.boolean()),
		isMemoryItem: v.boolean(),
		size: v.number(),
		contentType: v.string(),
		type: documentType,
		vectorizationStatus: v.union(
			v.literal("not-indexed"),
			v.literal("queued"),
			v.literal("processing"),
			v.literal("indexed"),
			v.literal("failed"),
		),
		chunkingStatus: v.union(
			v.literal("queued"),
			v.literal("processing"),
			v.literal("chunked"),
			v.literal("failed"),
		),
		// Relations
		knowledgeBases: v.array(v.id("knowledgeBases")),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		createdBy: v.id("users"),
		indexedAt: v.optional(v.string()),
		deletedAt: v.optional(v.string()),
		isArchived: v.optional(v.boolean()),
	}),
)
	.index("by_workspace_id", ["workspaceId"])
	.index("by_project_id", ["projectId"])
	.index("by_created_by", ["createdBy"])
	.index("by_deleted_at", ["deletedAt"])
	.index("by_key", ["key"])
	.index("by_knowledge_base", ["knowledgeBases"])
	.searchIndex("by_fileName", { searchField: "name" });
