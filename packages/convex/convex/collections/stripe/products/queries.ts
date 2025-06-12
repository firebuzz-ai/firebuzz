import { v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";
import { getCurrentUserWithWorkspace } from "../../users/utils";

export const getByStripeId = internalQuery({
  args: { stripeProductId: v.string() },
  handler: async (ctx, { stripeProductId }) => {
    return await ctx.db
      .query("products")
      .withIndex("by_stripe_product_id", (q) =>
        q.eq("stripeProductId", stripeProductId)
      )
      .unique();
  },
});

export const getByIdInternal = internalQuery({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getSubscriptionPlansWithPrices = query({
  handler: async (ctx) => {
    await getCurrentUserWithWorkspace(ctx); // This will throw an error if the user is not authenticated or does not have a workspace

    const allActiveProducts = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    const subscriptionPlans = allActiveProducts.filter(
      (product) => product.metadata?.type === "subscription"
    );

    const subscriptionPlansWithPrices = await Promise.all(
      subscriptionPlans.map(async (plan) => {
        const prices = await ctx.db
          .query("prices")
          .withIndex("by_product_id", (q) => q.eq("productId", plan._id))
          .collect();

        return {
          ...plan,
          prices,
        };
      })
    );

    return subscriptionPlansWithPrices;
  },
});
