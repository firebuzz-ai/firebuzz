import { auth } from "@clerk/nextjs/server";
import {
	api,
	ConvexError,
	fetchAction,
	type Id,
} from "@firebuzz/convex/nextjs";
import { stripIndents } from "@firebuzz/utils";
import { tool } from "ai";
import { z } from "zod";

export const searchKnowledgeBase = tool({
	description: stripIndents`
    Search the knowledge base of the project. Use this to search for information in the knowledge base of the project.
  `,
	parameters: z.object({
		query: z.string(),
		knowledgeBaseIds: z
			.array(z.string())
			.optional()
			.describe(
				"The ids of the knowledge bases to search for information in. You can use this if it's specified otherwise you will search all knowledge bases related to the project.",
			),
	}),
	execute: async ({ query, knowledgeBaseIds }) => {
		try {
			// Get Token
			const token = await (await auth()).getToken({ template: "convex" });

			if (!token) {
				return new Response("Unauthorized", { status: 401 });
			}

			// Read File Content
			const results = await fetchAction(
				api.collections.storage.documents.vectors.actions.vectorSearch,
				{
					query,
					knowledgeBases: knowledgeBaseIds as Id<"knowledgeBases">[],
				},
				{
					token,
				},
			);

			return {
				success: true,
				results,
			};
		} catch (error) {
			console.error(error);
			return {
				success: false,
				message:
					error instanceof ConvexError
						? error.message
						: "An error occurred while reading the file",
			};
		}
	},
});
