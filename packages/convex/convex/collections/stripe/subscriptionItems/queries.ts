import { v } from "convex/values";
import { internalQuery } from "../../../_generated/server";

export const getByStripeId = internalQuery({
  args: { stripeSubscriptionItemId: v.string() },
  handler: async (ctx, { stripeSubscriptionItemId }) => {
    return await ctx.db
      .query("subscriptionItems")
      .withIndex("by_stripe_subscription_item_id", (q) =>
        q.eq("stripeSubscriptionItemId", stripeSubscriptionItemId)
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
        q.eq("subscriptionId", subscriptionId)
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
