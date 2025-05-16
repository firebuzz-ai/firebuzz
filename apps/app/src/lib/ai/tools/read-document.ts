import { auth } from "@clerk/nextjs/server";
import { ConvexError, api, fetchQuery } from "@firebuzz/convex/nextjs";
import { stripIndents } from "@firebuzz/utils";
import { tool } from "ai";
import { z } from "zod";

export const readDocument = tool({
	description: stripIndents`
    Read the content of a file. Use this to read listed files:
    md, html, txt, csv, docx
  `,
	parameters: z.object({
		key: z.string(),
	}),
	execute: async ({ key }) => {
		try {
			// Get Token
			const token = await (await auth()).getToken({ template: "convex" });

			if (!token) {
				return new Response("Unauthorized", { status: 401 });
			}

			// Read File Content
			const { contents, isLong, summary } = await fetchQuery(
				api.collections.storage.documents.queries.readFileContentByKey,
				{
					key,
				},
				{
					token,
				},
			);

			return {
				success: true,
				contents,
				isLong,
				summary,
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
