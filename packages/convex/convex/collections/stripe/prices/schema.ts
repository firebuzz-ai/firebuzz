import { defineTable } from "convex/server";
import { v } from "convex/values";

export const priceSchema = defineTable(
  v.object({
    stripePriceId: v.string(),
    productId: v.id("products"), // Reference to products table
    unitAmount: v.optional(v.number()), // Amount in cents, null for usage-based
    currency: v.string(),
    interval: v.optional(
      v.union(
        v.literal("day"),
        v.literal("week"),
        v.literal("month"),
        v.literal("year")
      )
    ),
    intervalCount: v.optional(v.number()),
    type: v.union(v.literal("one_time"), v.literal("recurring")),
    active: v.boolean(),
    metadata: v.optional(v.record(v.string(), v.any())), // Stripe metadata as JSON
    updatedAt: v.optional(v.string()), // ISO String for last update
  })
)
  .index("by_product_id", ["productId"])
  .index("by_stripe_price_id", ["stripePriceId"]);
