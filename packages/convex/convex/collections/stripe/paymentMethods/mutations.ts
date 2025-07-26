import { v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { internalMutation } from "../../../_generated/server";
import { paymentMethodSchema } from "./schema";

export const createInternal = internalMutation({
	args: paymentMethodSchema.validator,
	handler: async (ctx, args) => {
		return await ctx.db.insert("paymentMethods", args);
	},
});

export const updateInternal = internalMutation({
	args: {
		paymentMethodId: v.id("paymentMethods"),
		stripePaymentMethodId: v.optional(v.string()),
		customerId: v.optional(v.id("customers")),
		workspaceId: v.optional(v.id("workspaces")),
		type: v.optional(
			v.union(
				v.literal("card"),
				v.literal("bank_account"),
				v.literal("sepa_debit"),
				v.literal("ideal"),
				v.literal("fpx"),
				v.literal("us_bank_account"),
			),
		),
		card: v.optional(
			v.object({
				brand: v.string(),
				last4: v.string(),
				expMonth: v.number(),
				expYear: v.number(),
			}),
		),
		isDefault: v.optional(v.boolean()),
		updatedAt: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const updateObject: Partial<Doc<"paymentMethods">> = {};

		if (args.stripePaymentMethodId) {
			updateObject.stripePaymentMethodId = args.stripePaymentMethodId;
		}

		if (args.customerId) {
			updateObject.customerId = args.customerId;
		}

		if (args.workspaceId) {
			updateObject.workspaceId = args.workspaceId;
		}

		if (args.type) {
			updateObject.type = args.type;
		}

		if (args.card) {
			updateObject.card = args.card;
		}

		if (args.isDefault !== undefined) {
			updateObject.isDefault = args.isDefault;
		}

		if (args.updatedAt) {
			updateObject.updatedAt = args.updatedAt;
		}

		await ctx.db.patch(args.paymentMethodId, updateObject);
	},
});

export const deleteInternal = internalMutation({
	args: {
		paymentMethodId: v.id("paymentMethods"),
	},
	handler: async (ctx, args) => {
		await ctx.db.delete(args.paymentMethodId);
	},
});

export const deleteByCustomerIdInternal = internalMutation({
	args: {
		customerId: v.id("customers"),
	},
	handler: async (ctx, args) => {
		const paymentMethods = await ctx.db
			.query("paymentMethods")
			.withIndex("by_customer_id", (q) => q.eq("customerId", args.customerId))
			.collect();

		for (const paymentMethod of paymentMethods) {
			await ctx.db.delete(paymentMethod._id);
		}
	},
});
