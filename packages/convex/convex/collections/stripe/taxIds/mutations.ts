import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internalMutation } from "../../../_generated/server";
import { taxIdSchema } from "./schema";

export const createInternal = internalMutation({
	args: {
		customerId: v.id("customers"),
		taxId: v.string(),
		country: v.optional(v.string()),
		type: v.optional(v.string()),
		value: v.string(),
		verification: taxIdSchema.validator.fields.verification,
	},
	handler: async (ctx, args) => {
		const { customerId, taxId, country, type, value, verification } = args;

		const taxIdDoc = await ctx.db.insert("taxIds", {
			customerId,
			taxId,
			country,
			type,
			value,
			verification,
			updatedAt: new Date().toISOString(),
		});

		return taxIdDoc;
	},
});

export const updateInternal = internalMutation({
	args: {
		id: v.id("taxIds"),
		verification: taxIdSchema.validator.fields.verification,
		country: v.optional(v.string()),
		type: v.optional(v.string()),
		value: v.string(),
	},
	handler: async (ctx, args) => {
		const { id, verification, country, type, value } = args;

		const taxIdDoc = await ctx.db.patch(id, {
			verification,
			country,
			type,
			value,
			updatedAt: new Date().toISOString(),
		});

		return taxIdDoc;
	},
});

export const deleteInternal = internalMutation({
	args: {
		id: v.id("taxIds"),
	},
	handler: async (ctx, args) => {
		const { id } = args;

		await ctx.db.delete(id);

		return true;
	},
});

export const deleteByCustomerIdInternal = internalMutation({
	args: {
		customerId: v.id("customers"),
	},
	handler: async (ctx, args) => {
		const { customerId } = args;

		const taxIds = await ctx.db
			.query("taxIds")
			.withIndex("by_customer_id", (q) => q.eq("customerId", customerId))
			.collect();

		await asyncMap(taxIds, (taxId) => ctx.db.delete(taxId._id));
	},
});
