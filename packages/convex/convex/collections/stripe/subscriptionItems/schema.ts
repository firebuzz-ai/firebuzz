import { v } from "convex/values";

export const subscriptionItemSchema = v.object({
	stripeSubscriptionItemId: v.string(),
	subscriptionId: v.id("subscriptions"), // Reference to subscriptions table
	priceId: v.id("prices"), // Reference to prices table
	quantity: v.number(),
	metadata: v.optional(v.record(v.string(), v.any())), // Stripe metadata as JSON
	updatedAt: v.optional(v.string()), // ISO String for last update
});
