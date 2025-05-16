import { embed, generateText } from "ai";
import { asyncMap } from "convex-helpers";
import { ConvexError, v } from "convex/values";
import { internal } from "../../../../_generated/api";
import type { Doc } from "../../../../_generated/dataModel";
import { action, internalAction } from "../../../../_generated/server";
import { openai } from "../../../../lib/openai";

export const vectorize = internalAction({
	args: {
		mediaId: v.id("media"),
		mediaKey: v.string(),
		projectId: v.id("projects"),
		workspaceId: v.id("workspaces"),
	},
	handler: async (ctx, args) => {
		const { mediaId, mediaKey, projectId, workspaceId } = args;

		const mediaUrl = `${process.env.R2_PUBLIC_URL}/${mediaKey}`;

		try {
			// Transcribe image
			const result = await generateText({
				model: openai("gpt-4o"),
				messages: [
					{
						role: "user",
						content: [
							{ type: "text", text: "Describe the image in detail." },
							{ type: "image", image: mediaUrl },
						],
					},
				],
			});

			// Create embedding
			const embedding = await embed({
				model: openai.embedding("text-embedding-3-large", {
					dimensions: 1536,
				}),
				value: result.text,
			});

			// Create media vector
			await ctx.runMutation(
				internal.collections.storage.media.vectors.mutations.createInternal,
				{
					mediaId,
					projectId,
					workspaceId,
					embedding: embedding.embedding,
				},
			);

			// Update media description
			await ctx.runMutation(
				internal.collections.storage.media.mutations.updateInternal,
				{
					id: mediaId,
					description: result.text,
				},
			);

			// Create media vector
		} catch (error) {
			console.error(error);
			throw new ConvexError("Failed to vectorize media");
		}
	},
});

export const vectorSearch = action({
	args: {
		query: v.string(),
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const { query, projectId } = args;

		const embedding = await embed({
			model: openai.embedding("text-embedding-3-large", {
				dimensions: 1536,
			}),
			value: query,
		});

		const results = await ctx.vectorSearch("mediaVectors", "by_emmbedings", {
			vector: embedding.embedding,
			limit: 8,
			filter: (q) => q.eq("projectId", projectId),
		});

		const filteredResults = results.filter(
			(result) => result._score && result._score >= 0.4,
		);

		// Get Vector Results
		const mediaIds = await asyncMap(filteredResults, async (result) => {
			const vectorResult = await ctx.runQuery(
				internal.collections.storage.media.vectors.queries.getByIdInternal,
				{ id: result._id },
			);

			return vectorResult?.mediaId;
		});

		// Get Media Items
		const mediaItems: (Doc<"media"> | undefined)[] = await asyncMap(
			mediaIds,
			async (mediaId) => {
				if (mediaId) {
					const media = await ctx.runQuery(
						internal.collections.storage.media.queries.getByIdInternal,
						{ id: mediaId },
					);

					return media as Doc<"media">;
				}
			},
		);

		return mediaItems.filter((item) => item !== undefined);
	},
});
