import { MINUTE, RateLimiter, SECOND } from "@convex-dev/rate-limiter";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalQuery } from "../_generated/server";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
	firecrawlScrape: { kind: "fixed window", rate: 100, period: MINUTE },
	ingestCreditUsage: { kind: "fixed window", rate: 100, period: SECOND },
	ingestTokenUsage: { kind: "fixed window", rate: 100, period: SECOND },
	exaSearchAndCrawl: { kind: "fixed window", rate: 5, period: SECOND },
	formSubmit: { kind: "fixed window", rate: 5, period: SECOND },
	analyticsQuery: { kind: "fixed window", rate: 20, period: SECOND },
	takeURLSnapshot: { kind: "fixed window", rate: 120, period: MINUTE },
});

export const checkLimit = internalQuery({
	args: {
		name: v.union(
			v.literal("firecrawlScrape"),
			v.literal("firecrawlBatchScrape"),
			v.literal("ingestCreditUsage"),
			v.literal("formSubmit"),
			v.literal("analyticsQuery"),
			v.literal("ingestTokenUsage"),
			v.literal("takeURLSnapshot"),
		),
		key: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await rateLimiter.check(
			ctx,
			args.name,
			args.key ? { key: args.key } : undefined,
		);
	},
});
