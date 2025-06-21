import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";
import {
	internalMutationWithTrigger,
	mutationWithTrigger,
} from "../../../triggers";
import { getCurrentUserWithWorkspace } from "../../users/utils";
import { documentsSchema } from "./schema";

export const create = mutationWithTrigger({
	args: {
		key: v.string(),
		name: v.string(),
		contentType: v.string(),
		size: v.number(),
		knowledgeBases: v.optional(v.array(v.id("knowledgeBases"))),
		type: documentsSchema.fields.type,
	},
	handler: async (ctx, args) => {
		// Check if user is allowed to create document
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId || !user.currentProjectId) {
			throw new Error("You are not allowed to create a document");
		}

		// Check knowledgeBases exist
		const knowledgeBases = args.knowledgeBases;
		const hasKnowledgeBases = knowledgeBases && knowledgeBases.length > 0;

		const documentId = await ctx.db.insert("documents", {
			...args,
			workspaceId: user.currentWorkspaceId,
			createdBy: user._id,
			projectId: user.currentProjectId,
			knowledgeBases: hasKnowledgeBases ? knowledgeBases : [],
			vectorizationStatus: hasKnowledgeBases ? "queued" : "not-indexed",
			chunkingStatus: "queued",
			isMemoryItem: false,
		});

		return documentId;
	},
});

export const deleteInternal = internalMutationWithTrigger({
	args: {
		id: v.id("documents"),
	},
	handler: async (ctx, { id }) => {
		await ctx.db.delete(id);
	},
});

export const deleteTemporary = mutationWithTrigger({
	args: {
		id: v.id("documents"),
	},
	handler: async (ctx, { id }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new Error("You are not allowed to delete this document");
		}

		// Check media is owned by user
		const document = await ctx.db.get(id);
		if (document?.workspaceId !== user?.currentWorkspaceId) {
			throw new Error("You are not allowed to delete this document");
		}

		// Delete document vectors
		await ctx.runMutation(
			internal.collections.storage.documents.vectors.utils.batchDelete,
			{
				documentId: id,
				numItems: 20,
			},
		);

		// Delete memoized documents
		await ctx.runMutation(
			internal.collections.storage.documents.memoized.mutations
				.deletePermanentByDocumentId,
			{
				documentId: id,
			},
		);

		await ctx.db.patch(id, {
			deletedAt: new Date().toISOString(),
		});
	},
});

export const deletePermanent = internalMutationWithTrigger({
	args: {
		id: v.id("documents"),
	},
	handler: async (ctx, { id }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new Error("You are not allowed to delete this document");
		}

		await ctx.db.delete(id);
	},
});

export const archive = mutationWithTrigger({
	args: {
		id: v.id("documents"),
	},
	handler: async (ctx, { id }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new Error("You are not allowed to archive this document");
		}

		await ctx.db.patch(id, { isArchived: true });
	},
});

export const restore = mutationWithTrigger({
	args: {
		id: v.id("documents"),
	},
	handler: async (ctx, { id }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new Error("You are not allowed to restore this document");
		}

		await ctx.db.patch(id, { isArchived: false });
	},
});

export const archiveMultiple = mutationWithTrigger({
	args: {
		ids: v.array(v.id("documents")),
	},
	handler: async (ctx, { ids }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new Error("You are not allowed to archive multiple documents");
		}

		await asyncMap(ids, async (id) => {
			await ctx.db.patch(id, { isArchived: true });
		});
	},
});

export const restoreMultiple = mutationWithTrigger({
	args: {
		ids: v.array(v.id("documents")),
	},
	handler: async (ctx, { ids }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new Error("You are not allowed to restore multiple documents");
		}

		await asyncMap(ids, async (id) => {
			await ctx.db.patch(id, { isArchived: false });
		});
	},
});

export const deleteTemporaryMultiple = mutationWithTrigger({
	args: {
		ids: v.array(v.id("documents")),
	},
	handler: async (ctx, { ids }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new Error("You are not allowed to delete these documents");
		}

		// Delete document vectors
		await asyncMap(ids, async (id) => {
			await ctx.runMutation(
				internal.collections.storage.documents.vectors.utils.batchDelete,
				{ documentId: id, numItems: 20 },
			);
		});

		// Delete memoized documents
		await asyncMap(ids, async (id) => {
			await ctx.runMutation(
				internal.collections.storage.documents.memoized.mutations
					.deletePermanentByDocumentId,
				{ documentId: id },
			);
		});

		await asyncMap(ids, async (id) => {
			await ctx.db.patch(id, { deletedAt: new Date().toISOString() });
		});
	},
});

export const update = internalMutationWithTrigger({
	args: {
		documentId: v.id("documents"),
		vectorizationStatus: v.optional(documentsSchema.fields.vectorizationStatus),
		chunkingStatus: v.optional(documentsSchema.fields.chunkingStatus),
		isLongDocument: v.optional(v.boolean()),
		summary: v.optional(v.string()),
		name: v.optional(v.string()),
		title: v.optional(v.string()),
		indexedAt: v.optional(v.string()),
	},
	handler: async (ctx, { documentId, ...args }) => {
		const updates: Record<string, string | boolean | undefined> = {};

		if (args.vectorizationStatus !== undefined) {
			updates.vectorizationStatus = args.vectorizationStatus;
		}

		if (args.chunkingStatus !== undefined) {
			updates.chunkingStatus = args.chunkingStatus;
		}

		if (args.isLongDocument !== undefined) {
			updates.isLongDocument = args.isLongDocument;
		}

		if (args.summary !== undefined) {
			updates.summary = args.summary;
		}

		if (args.name !== undefined) {
			updates.name = args.name;
		}

		if (args.title !== undefined) {
			updates.title = args.title;
		}

		if (args.indexedAt !== undefined) {
			updates.indexedAt = args.indexedAt;
		}

		if (Object.keys(updates).length > 0) {
			await ctx.db.patch(documentId, updates);
		}
	},
});

export const updateWithoutTrigger = internalMutation({
	args: {
		documentId: v.id("documents"),
		vectorizationStatus: v.optional(documentsSchema.fields.vectorizationStatus),
		chunkingStatus: v.optional(documentsSchema.fields.chunkingStatus),
		isLongDocument: v.optional(v.boolean()),
		summary: v.optional(v.string()),
		name: v.optional(v.string()),
		title: v.optional(v.string()),
		indexedAt: v.optional(v.string()),
	},
	handler: async (ctx, { documentId, ...args }) => {
		const updates: Record<string, string | boolean | undefined> = {};

		if (args.vectorizationStatus !== undefined) {
			updates.vectorizationStatus = args.vectorizationStatus;
		}

		if (args.chunkingStatus !== undefined) {
			updates.chunkingStatus = args.chunkingStatus;
		}

		if (args.isLongDocument !== undefined) {
			updates.isLongDocument = args.isLongDocument;
		}

		if (args.summary !== undefined) {
			updates.summary = args.summary;
		}

		if (args.name !== undefined) {
			updates.name = args.name;
		}

		if (args.title !== undefined) {
			updates.title = args.title;
		}

		if (args.indexedAt !== undefined) {
			updates.indexedAt = args.indexedAt;
		}

		if (Object.keys(updates).length > 0) {
			await ctx.db.patch(documentId, updates);
		}
	},
});

export const createMemoryItem = mutationWithTrigger({
	args: {
		key: v.string(),
		name: v.string(),
		content: v.string(),
		size: v.number(),
		knowledgeBase: v.id("knowledgeBases"),
	},
	handler: async (ctx, args) => {
		// Check if user is allowed to create document
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId || !user.currentProjectId) {
			throw new Error("You are not allowed to create a document");
		}

		const documentId = await ctx.db.insert("documents", {
			key: args.key,
			name: args.name,
			size: args.size,
			contentType: "application/json",
			type: "json",
			workspaceId: user.currentWorkspaceId,
			createdBy: user._id,
			projectId: user.currentProjectId,
			knowledgeBases: [args.knowledgeBase],
			vectorizationStatus: "queued",
			chunkingStatus: "queued",
			isMemoryItem: true,
		});

		await ctx.scheduler.runAfter(
			0,
			internal.collections.storage.documents.chunks.actions.chunkMemoryItem,
			{
				documentId,
				name: args.name,
				content: args.content,
				workspaceId: user.currentWorkspaceId,
				projectId: user.currentProjectId,
			},
		);

		return documentId;
	},
});

export const createMemoryItemInternal = internalMutationWithTrigger({
	args: {
		key: v.string(),
		name: v.string(),
		content: v.string(),
		contentType: v.string(),
		type: v.union(
			v.literal("md"),
			v.literal("html"),
			v.literal("txt"),
			v.literal("pdf"),
			v.literal("csv"),
			v.literal("docx"),
			v.literal("json"),
		),
		size: v.number(),
		knowledgeBase: v.id("knowledgeBases"),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		createdBy: v.id("users"),
	},
	handler: async (ctx, args) => {
		const documentId = await ctx.db.insert("documents", {
			key: args.key,
			name: args.name,
			size: args.size,
			contentType: args.contentType,
			type: args.type,
			workspaceId: args.workspaceId,
			createdBy: args.createdBy,
			projectId: args.projectId,
			knowledgeBases: [args.knowledgeBase],
			vectorizationStatus: "queued",
			chunkingStatus: "queued",
			isMemoryItem: true,
		});

		await ctx.scheduler.runAfter(
			0,
			internal.collections.storage.documents.chunks.actions.chunkMemoryItem,
			{
				documentId,
				name: args.name,
				content: args.content,
				workspaceId: args.workspaceId,
				projectId: args.projectId,
			},
		);

		return documentId;
	},
});

export const updateMemoryItem = mutationWithTrigger({
	args: {
		originalKey: v.string(),
		newKey: v.string(),
		documentId: v.id("documents"),
		name: v.string(),
		content: v.string(),
		size: v.number(),
	},
	handler: async (ctx, args) => {
		// Check if user is allowed to create document
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId || !user.currentProjectId) {
			throw new Error("You are not allowed to create a document");
		}

		// Update Document
		await ctx.db.patch(args.documentId, {
			key: args.newKey,
			name: args.name,
			size: args.size,
			summary: "", // Reset Summary
			title: "", // Reset Title
			chunkingStatus: "queued",
			vectorizationStatus: "queued",
		});

		// Get old chunks
		const oldChunks = await ctx.db
			.query("documentChunks")
			.withIndex("by_document_id", (q) => q.eq("documentId", args.documentId))
			.collect();

		// Delete old chunks
		await asyncMap(oldChunks, async (chunk) => {
			await ctx.db.delete(chunk._id);
		});

		// Get old vectors
		const oldVectors = await ctx.db
			.query("documentVectors")
			.withIndex("by_document_id", (q) => q.eq("documentId", args.documentId))
			.collect();

		// Delete old vectors
		await asyncMap(oldVectors, async (vector) => {
			await ctx.db.delete(vector._id);
		});

		// Create new chunks
		await ctx.scheduler.runAfter(
			0,
			internal.collections.storage.documents.chunks.actions.chunkMemoryItem,
			{
				documentId: args.documentId,
				name: args.name,
				content: args.content,
				workspaceId: user.currentWorkspaceId,
				projectId: user.currentProjectId,
			},
		);

		return args.documentId;
	},
});
