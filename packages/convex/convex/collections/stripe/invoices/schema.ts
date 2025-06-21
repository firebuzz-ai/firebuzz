import { v } from "convex/values";

export const invoiceSchema = v.object({
	stripeInvoiceId: v.string(),
	customerId: v.id("customers"), // Reference to customers table
	subscriptionId: v.optional(v.id("subscriptions")), // Reference to subscriptions table
	workspaceId: v.id("workspaces"),
	status: v.union(
		v.literal("draft"),
		v.literal("open"),
		v.literal("paid"),
		v.literal("uncollectible"),
		v.literal("void"),
	),
	amountPaid: v.number(), // Amount in cents
	amountDue: v.number(), // Amount in cents
	currency: v.string(),
	hostedInvoiceUrl: v.optional(v.string()),
	invoicePdf: v.optional(v.string()),
	dueDate: v.optional(v.string()),
	paidAt: v.optional(v.string()),
	updatedAt: v.optional(v.string()), // ISO String for last update
});
