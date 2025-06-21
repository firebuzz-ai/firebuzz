import { v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";

export const getByStripeId = internalQuery({
	args: { stripePaymentIntentId: v.string() },
	handler: async (ctx, { stripePaymentIntentId }) => {
		return await ctx.db
			.query("payments")
			.withIndex("by_stripe_payment_intent_id", (q) =>
				q.eq("stripePaymentIntentId", stripePaymentIntentId),
			)
			.unique();
	},
});

export const getByCustomerId = query({
	args: { customerId: v.id("customers") },
	handler: async (ctx, { customerId }) => {
		return await ctx.db
			.query("payments")
			.withIndex("by_customer_id", (q) => q.eq("customerId", customerId))
			.order("desc")
			.collect();
	},
});

export const getByInvoiceId = query({
	args: { invoiceId: v.id("invoices") },
	handler: async (ctx, { invoiceId }) => {
		return await ctx.db
			.query("payments")
			.withIndex("by_invoice_id", (q) => q.eq("invoiceId", invoiceId))
			.order("desc")
			.collect();
	},
});

export const getSuccessfulByCustomerId = query({
	args: { customerId: v.id("customers") },
	handler: async (ctx, { customerId }) => {
		return await ctx.db
			.query("payments")
			.filter((q) => q.eq(q.field("customerId"), customerId))
			.filter((q) => q.eq(q.field("status"), "succeeded"))
			.order("desc")
			.collect();
	},
});

export const getByIdInternal = internalQuery({
	args: { id: v.id("payments") },
	handler: async (ctx, { id }) => {
		return await ctx.db.get(id);
	},
});
