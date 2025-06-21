import { v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { internalMutation } from "../../../_generated/server";
import { subscriptionItemSchema } from "./schema";

export const createInternal = internalMutation({
	args: subscriptionItemSchema,
	handler: async (ctx, args) => {
		return await ctx.db.insert("subscriptionItems", args);
	},
});

export const updateInternal = internalMutation({
	args: {
		subscriptionItemId: v.id("subscriptionItems"),
		stripeSubscriptionItemId: v.optional(v.string()),
		subscriptionId: v.optional(v.id("subscriptions")),
		priceId: v.optional(v.id("prices")),
		quantity: v.optional(v.number()),
		metadata: v.optional(v.record(v.string(), v.any())),
		updatedAt: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const updateObject: Partial<Doc<"subscriptionItems">> = {};

		if (args.stripeSubscriptionItemId) {
			updateObject.stripeSubscriptionItemId = args.stripeSubscriptionItemId;
		}

		if (args.subscriptionId) {
			updateObject.subscriptionId = args.subscriptionId;
		}

		if (args.priceId) {
			updateObject.priceId = args.priceId;
		}

		if (args.quantity) {
			updateObject.quantity = args.quantity;
		}

		if (args.metadata) {
			updateObject.metadata = args.metadata;
		}

		if (args.updatedAt) {
			updateObject.updatedAt = args.updatedAt;
		}

		await ctx.db.patch(args.subscriptionItemId, updateObject);
	},
});

export const deleteInternal = internalMutation({
	args: {
		subscriptionItemId: v.id("subscriptionItems"),
	},
	handler: async (ctx, { subscriptionItemId }) => {
		await ctx.db.delete(subscriptionItemId);
	},
});

export const deleteBySubscriptionIdInternal = internalMutation({
	args: {
		subscriptionId: v.id("subscriptions"),
	},
	handler: async (ctx, { subscriptionId }) => {
		const subscriptionItems = await ctx.db
			.query("subscriptionItems")
			.withIndex("by_subscription_id", (q) =>
				q.eq("subscriptionId", subscriptionId),
			)
			.collect();

		for (const item of subscriptionItems) {
			await ctx.db.delete(item._id);
		}
	},
});
