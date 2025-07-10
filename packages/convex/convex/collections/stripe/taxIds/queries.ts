import { v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";

export const getByIdInternal = internalQuery({
	args: {
		id: v.id("taxIds"),
	},
	handler: async (ctx, args) => {
		const { id } = args;
		const taxId = await ctx.db.get(id);
		return taxId;
	},
});

export const getByStripeIdInternal = internalQuery({
	args: {
		stripeTaxId: v.string(),
	},
	handler: async (ctx, args) => {
		const { stripeTaxId } = args;
		const taxId = await ctx.db
			.query("taxIds")
			.withIndex("by_taxId", (q) => q.eq("taxId", stripeTaxId))
			.first();
		return taxId;
	},
});

export const getAllByCustomerIdInternal = internalQuery({
	args: {
		customerId: v.id("customers"),
	},
	handler: async (ctx, args) => {
		const { customerId } = args;
		const taxIds = await ctx.db
			.query("taxIds")
			.withIndex("by_customer_id", (q) => q.eq("customerId", customerId))
			.collect();
		return taxIds;
	},
});

export const getAllByCustomerId = query({
	args: {
		customerId: v.id("customers"),
	},
	handler: async (ctx, args) => {
		const { customerId } = args;
		const taxIds = await ctx.db
			.query("taxIds")
			.withIndex("by_customer_id", (q) => q.eq("customerId", customerId))
			.collect();
		return taxIds;
	},
});
