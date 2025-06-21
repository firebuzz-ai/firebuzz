import { embed } from "ai";
import { asyncMap } from "convex-helpers";
import { ConvexError, v } from "convex/values";
import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import { action } from "../../../_generated/server";
import { openai } from "../../../lib/openai";

export const vectorSearch = action({
	args: {
		query: v.string(),
		knowledgeBase: v.id("knowledgeBases"),
		limit: v.optional(v.number()),
		scoreThreshold: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { query, knowledgeBase, limit = 10, scoreThreshold = 0.2 } = args;

		const user = await ctx.runQuery(
			internal.collections.users.queries.getCurrentUserInternal,
		);

		const currentProjectId = user?.currentProjectId;

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
			limit,
			filter: (q) => q.eq("knowledgeBaseId", knowledgeBase),
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
			| (Omit<Doc<"documents">, "createdBy"> & {
					createdBy: Doc<"users"> | null;
					memoizedDocumentId: Id<"memoizedDocuments">;
			  })
			| undefined
		)[] = await asyncMap(
			uniqueVectorResults,
			async ({ documentId, _score }) => {
				if (documentId) {
					const document = await ctx.runQuery(
						internal.collections.storage.documents.queries.getByIdInternal,
						{ id: documentId },
					);

					if (!document) {
						return undefined;
					}

					const createdBy = await ctx.runQuery(
						internal.collections.users.queries.getByIdInternal,
						{ id: document?.createdBy },
					);

					const memoizedDocument = await ctx.runQuery(
						internal.collections.storage.documents.memoized.queries
							.getByDocumentAndKnowledgeBaseInternal,
						{ documentId, knowledgeBaseId: knowledgeBase },
					);

					return {
						...document,
						createdBy,
						memoizedDocumentId: memoizedDocument?._id,
					} as Omit<Doc<"documents">, "createdBy"> & {
						createdBy: Doc<"users"> | null;
						memoizedDocumentId: Id<"memoizedDocuments">;
					};
				}
			},
		);

		return documentItems.filter((item) => item !== undefined);
	},
});
