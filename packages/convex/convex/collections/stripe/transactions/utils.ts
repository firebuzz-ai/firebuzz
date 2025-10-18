import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";
import { retrier } from "../../../components/actionRetrier";
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

		// If there are no transactions, return
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

		// Continue deleting transactions items if there are more
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

export const batchAggregateAndSyncWithTinybird = internalMutation({
	args: {
		cursor: v.optional(v.string()),
		sessionId: v.id("agentSessions"),
		numItems: v.number(),
	},
	handler: async (ctx, { sessionId, cursor, numItems }) => {
		const { page, continueCursor } = await ctx.db
			.query("transactions")
			.withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
			.paginate({ numItems, cursor: cursor ?? null });

		console.log("handling batchAggregateAndSyncWithTinybird", page.length);

		// If there is no transaction in the batch, return
		if (page.length === 0) {
			return;
		}

		// Check ratelimit for ingestCreditUsage
		const { ok, retryAfter } = await ctx.runQuery(
			internal.components.ratelimits.checkLimit,
			{
				name: "ingestCreditUsage",
			},
		);

		const transactions = page.map((transaction) => ({
			type: "usage" as const,
			workspaceId: transaction.workspaceId,
			projectId: transaction.projectId!,
			userId: transaction.createdBy!,
			amount: transaction.amount,
			idempotencyKey: transaction.idempotencyKey!,
			createdAt: new Date(transaction._creationTime).toISOString(),
		}));

		await retrier.runAfter(
			ctx,
			ok ? 0 : retryAfter,
			internal.lib.tinybird.batchIngestCreditUsageAction,
			{ transactions },
		);

		if (
			continueCursor &&
			continueCursor !== cursor &&
			page.length === numItems
		) {
			await cascadePool.enqueueMutation(
				ctx,
				internal.collections.stripe.transactions.utils
					.batchAggregateAndSyncWithTinybird,
				{ sessionId, cursor: continueCursor, numItems },
			);
		}
	},
});
