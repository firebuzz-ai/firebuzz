import { defineTable } from "convex/server";
import { v } from "convex/values";

export const subscriptionItemMetadataSchema = v.union(
	v.object({
		isShadow: v.union(v.literal("true"), v.literal("false")),
		type: v.literal("subscription"),
	}),
	v.object({
		addonType: v.union(
			v.literal("extra-seat"),
			v.literal("extra-project"),
			v.literal("extra-traffic"),
		),
		type: v.literal("add-on"),
	}),
	v.object({
		topupType: v.union(v.literal("extra-credit")),
		type: v.literal("top-up"),
	}),
);

export const subscriptionItemSchema = defineTable(
	v.object({
		stripeSubscriptionItemId: v.string(),
		subscriptionId: v.id("subscriptions"), // Reference to subscriptions table
		priceId: v.id("prices"), // Reference to prices table
		productId: v.id("products"), // Reference to products table
		quantity: v.number(),
		metadata: v.optional(subscriptionItemMetadataSchema), // Stripe metadata as JSON
		updatedAt: v.optional(v.string()), // ISO String for last update
	}),
)
	.index("by_subscription_id", ["subscriptionId"])
	.index("by_stripe_subscription_item_id", ["stripeSubscriptionItemId"]);
