import { v } from "convex/values";
import Exa from "exa-js";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { calculateCreditsFromSpend } from "../ai/models/helpers";

const exaApiKey = process.env.EXA_API_KEY;

if (!exaApiKey) {
	throw new Error("EXA_API_KEY is not set");
}

export const exa = new Exa(exaApiKey);

export const searchAndCrawl = internalAction({
	args: {
		query: v.string(),
		includeDomains: v.optional(v.array(v.string())),
		excludeDomains: v.optional(v.array(v.string())),
		numResults: v.optional(v.number()),
		userLocation: v.optional(v.string()),
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
		workspaceId: v.id("workspaces"),
		sessionId: v.optional(v.id("agentSessions")),
		userId: v.id("users"),
		projectId: v.id("projects"),
	},
	handler: async (
		ctx,
		{
			query,
			includeDomains,
			excludeDomains,
			category,
			numResults,
			userLocation,
			workspaceId,
			sessionId,
			userId,
			projectId,
		},
	) => {
		// 1) Search and Crawl
		const searchResults = await exa.searchAndContents(query, {
			numResults: Math.min(numResults ?? 5, 8),
			userLocation: userLocation ?? "US",
			includeDomains,
			excludeDomains,
			category,
			type: "auto",
		});

		const timestampMs = Date.now();
		const randomHex = Math.floor(Math.random() * 0xffffff)
			.toString(16)
			.padStart(6, "0");
		const idempotencyKey = `exa-search:${timestampMs}-${randomHex}`;

		const cost = searchResults.costDollars?.total ?? 0.1;

		const calculateCredits = calculateCreditsFromSpend(cost);

		// 2) Add usage to the database
		await ctx.runMutation(
			internal.collections.stripe.transactions.mutations
				.addUsageIdempotentSyncWithTinybirdInternal,
			{
				amount: calculateCredits,
				idempotencyKey,
				reason: "Search and Crawl with Exa",
				workspaceId,
				sessionId,
				userId,
				projectId,
			},
		);

		// 4) Return Search Results
		return searchResults.results;
	},
});
