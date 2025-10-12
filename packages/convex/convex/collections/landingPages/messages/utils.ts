import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";
import { cascadePool } from "../../../components/workpools";

export const batchDelete = internalMutation({
	args: {
		cursor: v.optional(v.string()),
		landingPageId: v.id("landingPages"),
		numItems: v.number(),
	},
	handler: async (ctx, { landingPageId, cursor, numItems }) => {
		const { page, continueCursor } = await ctx.db
			.query("landingPageMessages")
			.withIndex("by_landing_page_id", (q) =>
				q.eq("landingPageId", landingPageId),
			)
			.paginate({ numItems, cursor: cursor ?? null });

		// Delete the landing page messages
		await asyncMap(page, (document) => ctx.db.delete(document._id));

		// Continue deleting landing page messages if there are more
		if (
			continueCursor &&
			continueCursor !== cursor &&
			page.length === numItems
		) {
			await cascadePool.enqueueMutation(
				ctx,
				internal.collections.landingPages.messages.utils.batchDelete,
				{
					landingPageId,
					cursor: continueCursor,
					numItems,
				},
			);
		}
	},
});
