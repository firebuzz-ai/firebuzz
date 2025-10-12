import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { internalQuery, query } from "../../../_generated/server";
import { ERRORS } from "../../../utils/errors";
import { getCurrentUserWithWorkspace } from "../../users/utils";
import { getCurrentShadowSubscription, getCurrentSubscription } from "./utils";

export const getByStripeId = internalQuery({
	args: { stripeSubscriptionId: v.string() },
	handler: async (ctx, { stripeSubscriptionId }) => {
		return await ctx.db
			.query("subscriptions")
			.withIndex("by_stripe_subscription_id", (q) =>
				q.eq("stripeSubscriptionId", stripeSubscriptionId),
			)
			.unique();
	},
});

export const getByIdInternal = internalQuery({
	args: { id: v.id("subscriptions") },
	handler: async (ctx, { id }) => {
		return await ctx.db.get(id);
	},
});

export const getCurrentByWorkspaceId = query({
	args: {},
	handler: async (ctx) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		if (!user) {
			throw new Error(ERRORS.UNAUTHORIZED);
		}

		if (!user.currentWorkspaceId) {
			return null;
		}

		const subscription = await getCurrentSubscription(
			ctx,
			user.currentWorkspaceId,
		);

		if (!subscription) {
			return null;
		}

		const shadowSubscription = await getCurrentShadowSubscription(
			ctx,
			user.currentWorkspaceId,
		);

		const subscriptionItems = await ctx.db
			.query("subscriptionItems")
			.withIndex("by_subscription_id", (q) =>
				q.eq("subscriptionId", subscription._id),
			)
			.collect();

		const itemsWithPricesAndProducts = await asyncMap(
			subscriptionItems,
			async (item) => {
				const price = await ctx.db.get(item.priceId);
				let product = null;

				if (price) {
					product = await ctx.db.get(price.productId);
				}

				return {
					...item,
					price,
					product,
				};
			},
		);

		return {
			...subscription,
			shadowSubscription,
			items: itemsWithPricesAndProducts,
		};
	},
});

export const getCurrentByWorkspaceIdInternal = internalQuery({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, { workspaceId }) => {
		return await getCurrentSubscription(ctx, workspaceId);
	},
});

export const getLastByWorkspaceIdInternal = internalQuery({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, { workspaceId }) => {
		// Get the most recent subscription for this workspace (including canceled ones)
		// Order by creation time descending to get the latest
		const subscription = await ctx.db
			.query("subscriptions")
			.withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId))
			.order("desc")
			.first();

		if (!subscription) {
			return null;
		}

		// Get subscription items with their prices and products
		const subscriptionItems = await ctx.db
			.query("subscriptionItems")
			.withIndex("by_subscription_id", (q) =>
				q.eq("subscriptionId", subscription._id),
			)
			.collect();

		const itemsWithPricesAndProducts = await asyncMap(
			subscriptionItems,
			async (item) => {
				const price = await ctx.db.get(item.priceId);
				let product = null;

				if (price) {
					product = await ctx.db.get(price.productId);
				}

				return {
					...item,
					price,
					product,
				};
			},
		);

		return {
			...subscription,
			items: itemsWithPricesAndProducts,
		};
	},
});
