import { v } from "convex/values";

export const transactionSchema = v.object({
	amount: v.number(), // Positive for additions, negative for usage/deductions
	type: v.union(
		// Credit additions
		v.literal("trial"),
		v.literal("subscription"),
		v.literal("topup"),
		v.literal("gift"),
		// Usage
		v.literal("usage"),
		// Adjustments
		v.literal("adjustment"),
		v.literal("refund"),
	),
	periodStart: v.string(), // ISO string - when the current period starts
	expiresAt: v.string(), // ISO string - when credits expire (current period end)
	// Relations
	workspaceId: v.id("workspaces"),
	customerId: v.id("customers"),
	createdBy: v.optional(v.id("users")),
	subscriptionId: v.optional(v.id("subscriptions")),
	// System fields
	reason: v.optional(v.string()), // Human readable reason for the credit transaction
	metadata: v.optional(v.record(v.string(), v.any())), // Additional data
	idempotencyKey: v.optional(v.string()), // For preventing duplicate transactions
	updatedAt: v.string(), // ISO string - last update time
});
