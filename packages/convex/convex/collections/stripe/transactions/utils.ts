import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";
import { cascadePool } from "../../../components/workpools";

export const batchDelete = internalMutation({
	args: {
		cursor: v.optional(v.string()),
		customerId: v.id("customers"),
		numItems: v.number(),
	},
	handler: async (ctx, { customerId, cursor, numItems }) => {
		const { page, continueCursor } = await ctx.db
			.query("transactions")
			.withIndex("by_customer_id", (q) => q.eq("customerId", customerId))
			.paginate({ numItems, cursor: cursor ?? null });

		// If there are no media items, return
		if (page.length === 0) {
			return;
		}

		// Delete the transcations
		await asyncMap(page, (transaction) =>
			ctx.runMutation(
				internal.collections.stripe.transactions.mutations.deleteInternal,
				{ transactionId: transaction._id },
			),
		);

		// Continue deleting media items if there are more
		if (
			continueCursor &&
			continueCursor !== cursor &&
			page.length === numItems
		) {
			await cascadePool.enqueueMutation(
				ctx,
				internal.collections.stripe.transactions.utils.batchDelete,
				{
					customerId,
					cursor: continueCursor,
					numItems,
				},
			);
		}
	},
});
