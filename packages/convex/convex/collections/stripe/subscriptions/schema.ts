import { v } from "convex/values";

export const subscriptionSchema = v.object({
	stripeSubscriptionId: v.string(),
	customerId: v.id("customers"), // Reference to customers table
	workspaceId: v.id("workspaces"),
	status: v.union(
		v.literal("incomplete"),
		v.literal("incomplete_expired"),
		v.literal("trialing"),
		v.literal("active"),
		v.literal("past_due"),
		v.literal("canceled"),
		v.literal("unpaid"),
		v.literal("paused"),
	),
	currentPeriodStart: v.string(),
	currentPeriodEnd: v.string(),
	cancelAtPeriodEnd: v.boolean(),
	interval: v.union(
		v.literal("month"),
		v.literal("year"),
		v.literal("week"),
		v.literal("day"),
	),
	canceledAt: v.optional(v.string()),
	trialStart: v.optional(v.string()),
	trialEnd: v.optional(v.string()),
	metadata: v.optional(v.record(v.string(), v.any())), // Stripe metadata as JSON
	updatedAt: v.optional(v.string()), // ISO String for last update
});
