import { v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";

export const getByStripeId = internalQuery({
	args: { stripeInvoiceId: v.string() },
	handler: async (ctx, { stripeInvoiceId }) => {
		return await ctx.db
			.query("invoices")
			.withIndex("by_stripe_invoice_id", (q) =>
				q.eq("stripeInvoiceId", stripeInvoiceId),
			)
			.unique();
	},
});

export const getByCustomerId = query({
	args: { customerId: v.id("customers") },
	handler: async (ctx, { customerId }) => {
		return await ctx.db
			.query("invoices")
			.withIndex("by_customer_id", (q) => q.eq("customerId", customerId))
			.order("desc")
			.collect();
	},
});

export const getByWorkspaceId = query({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, { workspaceId }) => {
		return await ctx.db
			.query("invoices")
			.withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId))
			.order("desc")
			.collect();
	},
});

export const getPaidByWorkspaceId = query({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, { workspaceId }) => {
		return await ctx.db
			.query("invoices")
			.withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId))
			.filter((q) => q.eq(q.field("status"), "paid"))
			.order("desc")
			.collect();
	},
});

export const getBySubscriptionId = query({
	args: { subscriptionId: v.id("subscriptions") },
	handler: async (ctx, { subscriptionId }) => {
		return await ctx.db
			.query("invoices")
			.withIndex("by_subscription_id", (q) =>
				q.eq("subscriptionId", subscriptionId),
			)
			.order("desc")
			.collect();
	},
});

export const getByIdInternal = internalQuery({
	args: { id: v.id("invoices") },
	handler: async (ctx, { id }) => {
		return await ctx.db.get(id);
	},
});
