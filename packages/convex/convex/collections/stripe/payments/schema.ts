import { v } from "convex/values";

export const paymentSchema = v.object({
	stripePaymentIntentId: v.string(),
	customerId: v.id("customers"), // Reference to customers table
	invoiceId: v.optional(v.id("invoices")), // Reference to invoices table
	workspaceId: v.id("workspaces"), // Reference to workspaces table
	amount: v.number(), // Amount in cents
	currency: v.string(),
	status: v.union(
		v.literal("requires_payment_method"),
		v.literal("requires_confirmation"),
		v.literal("requires_action"),
		v.literal("processing"),
		v.literal("requires_capture"),
		v.literal("canceled"),
		v.literal("succeeded"),
	),
	paymentMethod: v.optional(v.string()), // Payment method type
	metadata: v.optional(v.record(v.string(), v.any())), // Stripe metadata as JSON
	updatedAt: v.optional(v.string()), // ISO String for last update
});
