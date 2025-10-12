import { ConvexError, v } from "convex/values";
import Exa from "exa-js";
import { api, internal } from "../_generated/api";
import { action } from "../_generated/server";
import { ERRORS } from "../utils/errors";

const exaApiKey = process.env.EXA_API_KEY;

if (!exaApiKey) {
	throw new Error("EXA_API_KEY is not set");
}

export const exa = new Exa(exaApiKey);

export const searchAndCrawl = action({
	args: {
		query: v.string(),
		includeDomains: v.optional(v.array(v.string())),
		excludeDomains: v.optional(v.array(v.string())),
		category: v.optional(
			v.union(
				v.literal("company"),
				v.literal("research paper"),
				v.literal("news"),
				v.literal("pdf"),
				v.literal("github"),
				v.literal("tweet"),
				v.literal("personal site"),
				v.literal("linkedin profile"),
				v.literal("financial report"),
			),
		),
	},
	handler: async (ctx, { query, includeDomains, excludeDomains, category }) => {
		// 1) Get User
		const user = await ctx.runQuery(
			internal.collections.users.queries.getCurrentUserInternal,
		);

		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// 2) Search and Crawl
		const searchResults = await exa.searchAndContents(query, {
			numResults: 5,
			includeDomains,
			excludeDomains,
			category,
			type: "auto",
		});

		const timestampMs = Date.now();
		const randomHex = Math.floor(Math.random() * 0xffffff)
			.toString(16)
			.padStart(6, "0");
		const idempotencyKey = `${user._id}:${timestampMs}-${randomHex}-exa-search`;

		// 3) Add usage to the database
		await ctx.runMutation(
			api.collections.stripe.transactions.mutations
				.addUsageIdempotentSyncWithTinybird,
			{
				amount: 0.25,
				idempotencyKey,
				reason: "Search and Crawl with Exa",
			},
		);

		// 4) Return Search Results
		return searchResults.results;
	},
});
