import { v } from "convex/values";

export const paymentMethodSchema = v.object({
	stripePaymentMethodId: v.string(),
	customerId: v.id("customers"), // Reference to customers table
	workspaceId: v.id("workspaces"), // Reference to workspaces table
	type: v.union(
		v.literal("card"),
		v.literal("bank_account"),
		v.literal("sepa_debit"),
		v.literal("ideal"),
		v.literal("fpx"),
		v.literal("us_bank_account"),
	),
	card: v.optional(
		v.object({
			brand: v.string(),
			last4: v.string(),
			expMonth: v.number(),
			expYear: v.number(),
		}),
	),
	isDefault: v.boolean(),
	updatedAt: v.optional(v.string()), // ISO String for last update
});
