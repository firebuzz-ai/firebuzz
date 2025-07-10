import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";
import { ERRORS } from "../../../utils/errors";
import { getCurrentUserWithWorkspace } from "../../users/utils";

export const getBySubscriptionIdWithPrice = query({
	args: { subscriptionId: v.id("subscriptions") },
	handler: async (ctx, { subscriptionId }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		// Get subscription
		const subscription = await ctx.db.get(subscriptionId);

		if (!subscription) {
			throw new Error(ERRORS.NOT_FOUND);
		}

		if (user.currentWorkspaceId !== subscription.workspaceId) {
			throw new Error(ERRORS.UNAUTHORIZED);
		}

		// Get subscription items
		const subscriptionItems = await ctx.db
			.query("subscriptionItems")
			.withIndex("by_subscription_id", (q) =>
				q.eq("subscriptionId", subscriptionId),
			)
			.collect();

		// Get prices
		const subscriptionItemsWithPrice = await asyncMap(
			subscriptionItems,
			async (item) => {
				const price = await ctx.db.get(item.priceId);
				return {
					...item,
					price,
				};
			},
		);

		return subscriptionItemsWithPrice;
	},
});

export const getByStripeId = internalQuery({
	args: { stripeSubscriptionItemId: v.string() },
	handler: async (ctx, { stripeSubscriptionItemId }) => {
		return await ctx.db
			.query("subscriptionItems")
			.withIndex("by_stripe_subscription_item_id", (q) =>
				q.eq("stripeSubscriptionItemId", stripeSubscriptionItemId),
			)
			.unique();
	},
});

export const getBySubscriptionIdInternal = internalQuery({
	args: { subscriptionId: v.id("subscriptions") },
	handler: async (ctx, { subscriptionId }) => {
		return await ctx.db
			.query("subscriptionItems")
			.withIndex("by_subscription_id", (q) =>
				q.eq("subscriptionId", subscriptionId),
			)
			.collect();
	},
});

export const getByIdInternal = internalQuery({
	args: { id: v.id("subscriptionItems") },
	handler: async (ctx, { id }) => {
		return await ctx.db.get(id);
	},
});
