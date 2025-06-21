import { v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { internalMutation } from "../../../_generated/server";
import { invoiceSchema } from "./schema";

export const createInternal = internalMutation({
	args: invoiceSchema,
	handler: async (ctx, args) => {
		return await ctx.db.insert("invoices", args);
	},
});

export const updateInternal = internalMutation({
	args: {
		invoiceId: v.id("invoices"),
		stripeInvoiceId: v.optional(v.string()),
		customerId: v.optional(v.id("customers")),
		subscriptionId: v.optional(v.id("subscriptions")),
		workspaceId: v.optional(v.id("workspaces")),
		status: v.optional(
			v.union(
				v.literal("draft"),
				v.literal("open"),
				v.literal("paid"),
				v.literal("uncollectible"),
				v.literal("void"),
			),
		),
		amountPaid: v.optional(v.number()),
		amountDue: v.optional(v.number()),
		currency: v.optional(v.string()),
		hostedInvoiceUrl: v.optional(v.string()),
		invoicePdf: v.optional(v.string()),
		dueDate: v.optional(v.string()),
		paidAt: v.optional(v.string()),
		updatedAt: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const updateObject: Partial<Doc<"invoices">> = {};

		if (args.stripeInvoiceId) {
			updateObject.stripeInvoiceId = args.stripeInvoiceId;
		}

		if (args.customerId) {
			updateObject.customerId = args.customerId;
		}

		if (args.subscriptionId) {
			updateObject.subscriptionId = args.subscriptionId;
		}

		if (args.workspaceId) {
			updateObject.workspaceId = args.workspaceId;
		}

		if (args.status) {
			updateObject.status = args.status;
		}

		if (args.amountPaid) {
			updateObject.amountPaid = args.amountPaid;
		}

		if (args.amountDue) {
			updateObject.amountDue = args.amountDue;
		}

		if (args.currency) {
			updateObject.currency = args.currency;
		}

		if (args.hostedInvoiceUrl) {
			updateObject.hostedInvoiceUrl = args.hostedInvoiceUrl;
		}

		if (args.invoicePdf) {
			updateObject.invoicePdf = args.invoicePdf;
		}

		if (args.dueDate) {
			updateObject.dueDate = args.dueDate;
		}

		if (args.paidAt) {
			updateObject.paidAt = args.paidAt;
		}

		if (args.updatedAt) {
			updateObject.updatedAt = args.updatedAt;
		}

		await ctx.db.patch(args.invoiceId, updateObject);
	},
});
