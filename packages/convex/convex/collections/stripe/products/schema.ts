import { v } from "convex/values";

export const productSchema = v.object({
  stripeProductId: v.string(),
  name: v.string(),
  description: v.optional(v.string()),
  active: v.boolean(),
  metadata: v.optional(v.record(v.string(), v.any())), // Stripe metadata as JSON
  updatedAt: v.optional(v.string()), // ISO String for last update
});
