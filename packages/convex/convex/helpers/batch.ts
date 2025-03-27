import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

export const batchDeleteCampaigns = internalMutation({
	args: {
		cursor: v.string(),
		projectId: v.id("projects"),
		numItems: v.number(),
	},
	handler: async (ctx, { projectId, cursor, numItems }) => {
		// Get the campaigns
		const { page, continueCursor } = await ctx.db
			.query("campaigns")
			.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
			.paginate({
				numItems,
				cursor,
			});

		// If there are no campaigns, return
		if (page.length === 0) {
			return;
		}

		// Delete files
		await asyncMap(page, (campaign) =>
			ctx.runMutation(
				internal.collections.campaigns.mutations.deleteCampaignInternal,
				{
					id: campaign._id,
				},
			),
		);

		if (continueCursor && continueCursor !== cursor) {
			await ctx.scheduler.runAfter(
				0,
				internal.helpers.batch.batchDeleteCampaigns,
				{
					projectId,
					cursor: continueCursor,
					numItems,
				},
			);
		}
	},
});
