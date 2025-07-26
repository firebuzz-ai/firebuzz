import { auth } from "@clerk/nextjs/server";
import { ConvexError, api, fetchAction } from "@firebuzz/convex/nextjs";
import { stripIndents } from "@firebuzz/utils";
import { tool } from "ai";
import { z } from "zod";

export const searchWeb = tool({
	description: stripIndents`
    Search the web using Exa for up-to-date information.
    You can specify a query, and optionally include/exclude domains, and specify a category.
  `,
	parameters: z.object({
		query: z.string().describe("The search query."),
		includeDomains: z
			.array(z.string())
			.optional()
			.describe("An array of domains to specifically search within."),
		excludeDomains: z
			.array(z.string())
			.optional()
			.describe("An array of domains to exclude from the search."),
		category: z
			.enum([
				"company",
				"research paper",
				"news",
				"pdf",
				"github",
				"tweet",
				"personal site",
				"linkedin profile",
				"financial report",
			])
			.optional()
			.describe("The category to search for."),
	}),
	execute: async ({ query, includeDomains, excludeDomains, category }) => {
		try {
			const token = await (await auth()).getToken({ template: "convex" });

			if (!token) {
				return { success: false, message: "Unauthorized" };
			}

			const results = await fetchAction(
				api.lib.exa.searchAndCrawl,
				{
					query,
					includeDomains,
					excludeDomains,
					category,
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
						? error.data
						: "An error occurred while searching the web.",
			};
		}
	},
});
