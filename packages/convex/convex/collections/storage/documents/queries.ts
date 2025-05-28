import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";

import { v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";
import {
	aggregateDocuments,
	aggregateMemoizedDocuments,
} from "../../../aggregates";
import { getCurrentUser } from "../../users/utils";
import { documentsSchema } from "./schema";

export const getPaginated = query({
	args: {
		paginationOpts: paginationOptsValidator,
		sortOrder: v.union(v.literal("asc"), v.literal("desc")),
		type: v.optional(documentsSchema.fields.type),
		knowledgeBaseId: v.optional(v.id("knowledgeBases")),
		searchQuery: v.optional(v.string()),
		isArchived: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		{ paginationOpts, sortOrder, type, searchQuery, isArchived },
	) => {
		const user = await getCurrentUser(ctx);
		const projectId = user?.currentProject;

		if (!user || !projectId) {
			throw new ConvexError("User not found");
		}

		// If there's a search query, use the search index
		const query = searchQuery
			? ctx.db
					.query("documents")
					.withSearchIndex("by_fileName", (q) => q.search("name", searchQuery))

					.filter((q) => q.eq(q.field("projectId"), projectId))
					.filter((q) => (type ? q.eq(q.field("type"), type) : true))
					.filter((q) =>
						isArchived
							? q.eq(q.field("isArchived"), isArchived ?? false)
							: true,
					)
					.filter((q) => q.eq(q.field("deletedAt"), undefined))
					.filter((q) => q.eq(q.field("isMemoryItem"), false))
					.paginate(paginationOpts)
			: ctx.db
					.query("documents")
					.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
					.filter((q) =>
						isArchived
							? q.eq(q.field("isArchived"), isArchived ?? false)
							: true,
					)
					.filter((q) => (type ? q.eq(q.field("type"), type) : true))
					.filter((q) => q.eq(q.field("deletedAt"), undefined))
					.filter((q) => q.eq(q.field("isMemoryItem"), false))
					.order(sortOrder)
					.paginate(paginationOpts);

		return await query;
	},
});

export const getById = query({
	args: {
		id: v.id("documents"),
	},
	handler: async (ctx, args) => {
		await getCurrentUser(ctx);
		const document = await ctx.db.get(args.id);
		if (!document) {
			throw new ConvexError("Document not found");
		}
		const createdBy = document.createdBy
			? await ctx.db.get(document.createdBy)
			: null;
		return {
			...document,
			createdBy,
		};
	},
});

export const getByIdInternal = internalQuery({
	args: {
		id: v.id("documents"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const getTotalSize = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		return await aggregateDocuments.sum(ctx, {
			namespace: args.projectId,
			// @ts-ignore
			bounds: {},
		});
	},
});

export const getTotalCount = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		return await aggregateDocuments.count(ctx, {
			namespace: args.projectId,
			bounds: {},
		});
	},
});

export const readFileContentByKey = query({
	args: {
		key: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);

		if (!user) {
			throw new ConvexError("User not found");
		}

		const document = await ctx.db
			.query("documents")
			.withIndex("by_key", (q) => q.eq("key", args.key))
			.first();

		if (document?.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("You are not allowed to read this document");
		}

		if (!document) {
			throw new ConvexError("Document not found");
		}

		// Check if the document is long
		const isLong = document.isLongDocument;

		if (isLong)
			return {
				summary: document.summary,
				isLong,
				contents: [],
			};

		// Get Chunks
		const chunks = await ctx.db
			.query("documentChunks")
			.withIndex("by_document_id", (q) => q.eq("documentId", document._id))
			.collect();

		// Get Content
		const chunkContents = chunks.map((chunk) => chunk.content);

		return {
			contents: chunkContents,
			isLong: false,
			summary: document.summary,
		};
	},
});

export const getDocumentIdByKey = query({
	args: {
		key: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);

		if (!user) {
			throw new ConvexError("User not found");
		}

		return await ctx.db
			.query("documents")
			.withIndex("by_key", (q) => q.eq("key", args.key))
			.first();
	},
});

export const getPaginatedByKnowledgeBase = query({
	args: {
		knowledgeBaseId: v.id("knowledgeBases"),
		sortOrder: v.union(v.literal("asc"), v.literal("desc")),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const paginationResult = await ctx.db
			.query("memoizedDocuments")
			.withIndex("by_knowledge_base", (q) =>
				q.eq("knowledgeBaseId", args.knowledgeBaseId),
			)
			.order(args.sortOrder)
			.paginate(args.paginationOpts);

		const documents = await Promise.all(
			paginationResult.page.map(async (memoizedDocument) => {
				const document = await ctx.db.get(memoizedDocument.documentId);

				if (!document) {
					return null;
				}

				return {
					...document,
					createdBy: await ctx.db.get(document.createdBy),
					memoizedDocumentId: memoizedDocument._id,
				};
			}),
		).then((docs) =>
			docs.filter((doc): doc is NonNullable<typeof doc> => doc !== null),
		);

		return { ...paginationResult, page: documents };
	},
});

export const getTotalCountByKnowledgeBase = query({
	args: {
		knowledgeBaseId: v.id("knowledgeBases"),
	},
	handler: async (ctx, args) => {
		return await aggregateMemoizedDocuments.count(ctx, {
			namespace: args.knowledgeBaseId,
			// @ts-ignore
			bounds: {},
		});
	},
});
