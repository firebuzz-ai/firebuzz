import { stripIndents } from "@firebuzz/utils";
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import { internalAction } from "../../../_generated/server";
import { openai } from "../../../lib/openai";
import { documentsSchema } from "./schema";

export const summarizeDocument = internalAction({
	args: {
		documentId: v.id("documents"),
		name: v.string(),
		content: v.string(),
		type: documentsSchema.validator.fields.type,
	},
	handler: async (ctx, args) => {
		const { documentId, name, content, type } = args;

		// 1. Summarize Document
		const { object } = await generateObject({
			model: openai("gpt-4o-mini"),
			schema: z.object({
				summary: z.string().describe("A summary of the document."),
				title: z.string().describe("A title for the document."),
			}),
			prompt: stripIndents`
        Summarise the following file:
        File type: ${type}
        File name: ${name}
        File content: ${content}
        Make sure to include all the information from the document and the maximum length is 500 characters.
      `,
		});

		// 2. Update Document
		await ctx.runMutation(
			internal.collections.storage.documents.mutations.updateWithoutTrigger,
			{
				documentId,
				summary: object.summary,
				title: object.title,
			},
		);
	},
});
