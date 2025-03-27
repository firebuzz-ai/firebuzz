import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { aggregateCampaigns } from "../aggregates";

export const cleanImageAggregates = internalMutation({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		return await aggregateCampaigns.clear(ctx, {
			namespace: args.projectId,
		});
	},
});
