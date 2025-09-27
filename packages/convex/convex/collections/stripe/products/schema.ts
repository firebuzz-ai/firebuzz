import { defineTable } from "convex/server";
import { v } from "convex/values";

export const subscriptionMetadataSchema = v.object({
  credits: v.string(),
  isPublic: v.union(v.literal("true"), v.literal("false")),
  isRecurring: v.literal("true"),
  projects: v.string(),
  seats: v.string(),
  shadowPriceId: v.string(),
  traffic: v.string(),
  type: v.literal("subscription"),
});

export const addonMetadataSchema = v.object({
  addonType: v.union(
    v.literal("extra-seat"),
    v.literal("extra-project"),
    v.literal("extra-traffic")
  ),
  isPublic: v.union(v.literal("true"), v.literal("false")),
  isRecurring: v.literal("true"),
  type: v.literal("add-on"),
});

export const topupMetadataSchema = v.object({
  topupType: v.union(v.literal("extra-credit")),
  isPublic: v.union(v.literal("true"), v.literal("false")),
  isRecurring: v.literal("false"),
  type: v.literal("top-up"),
});

export const productSchema = defineTable(
  v.object({
    stripeProductId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    active: v.boolean(),
    metadata: v.optional(
      v.union(
        subscriptionMetadataSchema,
        addonMetadataSchema,
        topupMetadataSchema
      )
    ), // Stripe metadata as JSON
    updatedAt: v.optional(v.string()), // ISO String for last update
  })
).index("by_stripe_product_id", ["stripeProductId"]);
