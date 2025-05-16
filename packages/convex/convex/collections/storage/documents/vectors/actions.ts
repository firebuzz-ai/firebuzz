import { embed, embedMany } from "ai";
import { asyncMap } from "convex-helpers";
import { ConvexError, v } from "convex/values";
import { internal } from "../../../../_generated/api";
import type { Doc } from "../../../../_generated/dataModel";
import { action, internalAction } from "../../../../_generated/server";
import { openai } from "../../../../lib/openai";

export const vectorSearch = action({
	args: {
		query: v.string(),
		knowledgeBases: v.optional(v.array(v.id("knowledgeBases"))),
		documentId: v.optional(v.id("documents")),
		limit: v.optional(v.number()),
		scoreThreshold: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const {
			query,
			knowledgeBases,
			documentId,
			limit,
			scoreThreshold = 0.2,
		} = args;

		const user = await ctx.runQuery(
			internal.collections.users.queries.getCurrentUserInternal,
		);

		const currentProjectId = user?.currentProject;

		if (!user || !currentProjectId) {
			throw new ConvexError("Unauthorized");
		}

		const embedding = await embed({
			model: openai.embedding("text-embedding-3-large", {
				dimensions: 1536,
			}),
			value: query,
		});

		const results = await ctx.vectorSearch("documentVectors", "by_emmbedings", {
			vector: embedding.embedding,
			limit: limit ?? 10,
			filter: (q) =>
				documentId
					? q.eq("documentId", documentId)
					: knowledgeBases && knowledgeBases.length > 0
						? q.or(...knowledgeBases.map((id) => q.eq("knowledgeBaseId", id)))
						: q.eq("projectId", currentProjectId),
		});

		const filteredResults = results.filter(
			(result) => result._score && result._score >= scoreThreshold,
		);

		// Get Vector Results
		const vectorResults = await asyncMap(filteredResults, async (result) => {
			const vectorResult = await ctx.runQuery(
				internal.collections.storage.documents.vectors.queries.getByIdInternal,
				{ id: result._id },
			);

			return {
				...vectorResult,
				_score: result._score,
			} as Doc<"documentVectors"> & { _score: number };
		});

		// Filter Unique Vector Results
		const uniqueVectorResults = vectorResults.reduce(
			(acc, result) => {
				if (!result) return acc;

				if (!acc.find((r) => r.chunkId === result.chunkId)) {
					acc.push(result);
				}

				return acc;
			},
			[] as (Doc<"documentVectors"> & { _score: number })[],
		);

		// Get Chunk Items with Document Data
		const documentItems: (
			| (Doc<"documentChunks"> & {
					document: Doc<"documents">;
					_score: number;
			  })
			| undefined
		)[] = await asyncMap(
			uniqueVectorResults,
			async ({ chunkId, documentId, _score }) => {
				if (chunkId && documentId) {
					const chunk = await ctx.runQuery(
						internal.collections.storage.documents.chunks.queries.getById,
						{ id: chunkId },
					);

					const document = await ctx.runQuery(
						internal.collections.storage.documents.queries.getByIdInternal,
						{ id: documentId },
					);

					if (!document || !chunk) {
						return undefined;
					}

					return {
						...chunk,
						document,
						_score,
					} as Doc<"documentChunks"> & {
						document: Doc<"documents">;
						_score: number;
					};
				}
			},
		);

		return documentItems
			.filter((item) => item !== undefined)
			.map((item) => ({
				id: item._id,
				score: item._score,
				content: item.content,
				chunkIndex: item.index,
				documentId: item.documentId,
				documentName: item.document.name,
				documentType: item.document.type,
				documentKey: item.document.key,
			}));
	},
});

export const vectorSearchInternal = internalAction({
	args: {
		query: v.string(),
		knowledgeBaseId: v.optional(v.array(v.id("knowledgeBases"))),
		projectId: v.id("projects"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { query, knowledgeBaseId, projectId, limit } = args;

		const embedding = await embed({
			model: openai.embedding("text-embedding-3-large", {
				dimensions: 1536,
			}),
			value: query,
		});

		const results = await ctx.vectorSearch("documentVectors", "by_emmbedings", {
			vector: embedding.embedding,
			limit: limit ?? 10,
			filter: (q) =>
				knowledgeBaseId && knowledgeBaseId.length > 0
					? q.or(...knowledgeBaseId.map((id) => q.eq("knowledgeBaseId", id)))
					: q.eq("projectId", projectId),
		});

		const filteredResults = results.filter(
			(result) => result._score && result._score >= 0.2,
		);

		// Get Vector Results
		const vectorResults = await asyncMap(filteredResults, async (result) => {
			const vectorResult = await ctx.runQuery(
				internal.collections.storage.documents.vectors.queries.getByIdInternal,
				{ id: result._id },
			);

			return {
				...vectorResult,
				_score: result._score,
			} as Doc<"documentVectors"> & { _score: number };
		});

		// Filter Unique Vector Results
		const uniqueVectorResults = vectorResults.reduce(
			(acc, result) => {
				if (!result) return acc;

				if (!acc.find((r) => r.chunkId === result.chunkId)) {
					acc.push(result);
				}

				return acc;
			},
			[] as (Doc<"documentVectors"> & { _score: number })[],
		);

		// Get Chunk Items with Document Data
		const documentItems: (
			| (Doc<"documentChunks"> & {
					document: Doc<"documents">;
					_score: number;
			  })
			| undefined
		)[] = await asyncMap(
			uniqueVectorResults,
			async ({ chunkId, documentId, _score }) => {
				if (chunkId && documentId) {
					const chunk = await ctx.runQuery(
						internal.collections.storage.documents.chunks.queries.getById,
						{ id: chunkId },
					);

					const document = await ctx.runQuery(
						internal.collections.storage.documents.queries.getByIdInternal,
						{ id: documentId },
					);

					if (!document || !chunk) {
						return undefined;
					}

					return {
						...chunk,
						document,
						_score,
					} as Doc<"documentChunks"> & {
						document: Doc<"documents">;
						_score: number;
					};
				}
			},
		);

		return documentItems.filter((item) => item !== undefined);
	},
});

export const vectorize = internalAction({
	args: {
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		documentId: v.id("documents"),
		knowledgeBases: v.array(v.id("knowledgeBases")),
	},
	handler: async (ctx, args) => {
		const { workspaceId, projectId, documentId, knowledgeBases } = args;

		try {
			// 1. Update Status to Processing
			await ctx.runMutation(
				internal.collections.storage.documents.mutations.updateWithoutTrigger,
				{
					documentId,
					vectorizationStatus: "processing",
				},
			);

			// 2. Get Document Chunks
			const chunks = await ctx.runQuery(
				internal.collections.storage.documents.chunks.queries.getByDocumentId,
				{ documentId },
			);

			// 3. Vectorize Chunks
			const embeddings = await embedMany({
				model: openai.embedding("text-embedding-3-large", {
					dimensions: 1536,
				}),
				values: chunks.map((chunk) => chunk.content),
			});

			// 4. Create Document Vector Items for each knowledgeBase
			await asyncMap(knowledgeBases, async (knowledgeBase) => {
				await asyncMap(chunks, async (chunk, index) => {
					await ctx.runMutation(
						internal.collections.storage.documents.vectors.mutations
							.createInternal,
						{
							documentId,
							projectId,
							workspaceId,
							embedding: embeddings.embeddings[index],
							knowledgeBaseId: knowledgeBase,
							chunkId: chunk._id,
						},
					);
				});
			});

			// Update Status to Completed
			await ctx.runMutation(
				internal.collections.storage.documents.mutations.updateWithoutTrigger,
				{
					documentId,
					vectorizationStatus: "indexed",
				},
			);

			// Create Memoized Document
			await ctx.runMutation(
				internal.collections.storage.documents.memoized.mutations.create,
				{
					documentId,
					knowledgeBases,
				},
			);
		} catch (error) {
			// Update Status to Failed
			await ctx.runMutation(
				internal.collections.storage.documents.mutations.updateWithoutTrigger,
				{
					documentId,
					vectorizationStatus: "failed",
				},
			);

			console.error(error);
			if (error instanceof ConvexError) {
				throw error;
			}
			throw new ConvexError("Failed to vectorize document");
		}
	},
});
