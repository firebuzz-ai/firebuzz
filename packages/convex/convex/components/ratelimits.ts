import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalQuery } from "../_generated/server";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
	firecrawlScrape: { kind: "fixed window", rate: 100, period: MINUTE },
});

export const checkLimit = internalQuery({
	args: {
		key: v.union(
			v.literal("firecrawlScrape"),
			v.literal("firecrawlBatchScrape"),
		),
	},
	handler: async (ctx, args) => {
		return await rateLimiter.check(ctx, args.key);
	},
});
