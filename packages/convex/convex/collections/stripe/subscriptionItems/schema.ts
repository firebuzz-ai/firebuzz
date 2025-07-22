import { defineTable } from "convex/server";
import { v } from "convex/values";

export const subscriptionItemSchema = defineTable(
  v.object({
    stripeSubscriptionItemId: v.string(),
    subscriptionId: v.id("subscriptions"), // Reference to subscriptions table
    priceId: v.id("prices"), // Reference to prices table
    productId: v.id("products"), // Reference to products table
    quantity: v.number(),
    metadata: v.optional(v.record(v.string(), v.any())), // Stripe metadata as JSON
    updatedAt: v.optional(v.string()), // ISO String for last update
  })
)
  .index("by_subscription_id", ["subscriptionId"])
  .index("by_stripe_subscription_item_id", ["stripeSubscriptionItemId"]);
