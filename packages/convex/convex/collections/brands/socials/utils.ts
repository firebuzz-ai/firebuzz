import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";
import { cascadePool } from "../../../workpools";

export const batchDelete = internalMutation({
	args: {
		cursor: v.optional(v.string()),
		brandId: v.id("brands"),
		numItems: v.number(),
	},
	handler: async (ctx, { brandId, cursor, numItems }) => {
		// Get the socials
		const { page, continueCursor } = await ctx.db
			.query("socials")
			.withIndex("by_brand_id", (q) => q.eq("brandId", brandId))
			.paginate({
				numItems,
				cursor: cursor ?? null,
			});

		// If there are no socials, return
		if (page.length === 0) {
			return;
		}

		// Delete the socials
		await asyncMap(page, async (social) => await ctx.db.delete(social._id));

		// If there are more socials, delete them
		if (
			continueCursor &&
			continueCursor !== cursor &&
			page.length === numItems
		) {
			await cascadePool.enqueueMutation(
				ctx,
				internal.collections.brands.socials.utils.batchDelete,
				{
					brandId,
					cursor: continueCursor,
					numItems,
				},
			);
		}
	},
});
