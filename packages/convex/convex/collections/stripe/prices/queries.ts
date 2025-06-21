import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { internalQuery, query } from "../../../_generated/server";

export const getByStripeId = internalQuery({
  args: { stripePriceId: v.string() },
  handler: async (ctx, { stripePriceId }) => {
    return await ctx.db
      .query("prices")
      .withIndex("by_stripe_price_id", (q) =>
        q.eq("stripePriceId", stripePriceId)
      )
      .unique();
  },
});

export const getAllByStripeIds = internalQuery({
  args: { stripePriceIds: v.array(v.string()) },
  handler: async (ctx, { stripePriceIds }) => {
    const prices = await asyncMap(stripePriceIds, async (stripePriceId) => {
      const price = await ctx.db
        .query("prices")
        .withIndex("by_stripe_price_id", (q) =>
          q.eq("stripePriceId", stripePriceId)
        )
        .unique();

      if (!price) {
        return null;
      }

      return price;
    });

    return prices.filter((price) => price !== null) as Doc<"prices">[];
  },
});

export const getByProductId = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    return await ctx.db
      .query("prices")
      .withIndex("by_product_id", (q) => q.eq("productId", productId))
      .collect();
  },
});

export const getActiveByProductId = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    return await ctx.db
      .query("prices")
      .filter((q) => q.eq(q.field("productId"), productId))
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
  },
});

export const getRecurring = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("prices")
      .filter((q) => q.eq(q.field("type"), "recurring"))
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
  },
});

export const getByIdInternal = internalQuery({
  args: { id: v.id("prices") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});
