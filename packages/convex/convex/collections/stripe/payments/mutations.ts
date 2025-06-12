import { v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { internalMutation } from "../../../_generated/server";
import { paymentSchema } from "./schema";

export const createInternal = internalMutation({
  args: paymentSchema,
  handler: async (ctx, args) => {
    return await ctx.db.insert("payments", args);
  },
});

export const updateInternal = internalMutation({
  args: {
    paymentId: v.id("payments"),
    stripePaymentIntentId: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    invoiceId: v.optional(v.id("invoices")),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("requires_payment_method"),
        v.literal("requires_confirmation"),
        v.literal("requires_action"),
        v.literal("processing"),
        v.literal("requires_capture"),
        v.literal("canceled"),
        v.literal("succeeded")
      )
    ),
    paymentMethod: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
    updatedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updateObject: Partial<Doc<"payments">> = {};

    if (args.stripePaymentIntentId) {
      updateObject.stripePaymentIntentId = args.stripePaymentIntentId;
    }

    if (args.customerId) {
      updateObject.customerId = args.customerId;
    }

    if (args.invoiceId) {
      updateObject.invoiceId = args.invoiceId;
    }

    if (args.amount) {
      updateObject.amount = args.amount;
    }

    if (args.currency) {
      updateObject.currency = args.currency;
    }

    if (args.status) {
      updateObject.status = args.status;
    }

    if (args.paymentMethod) {
      updateObject.paymentMethod = args.paymentMethod;
    }

    if (args.metadata) {
      updateObject.metadata = args.metadata;
    }

    if (args.updatedAt) {
      updateObject.updatedAt = args.updatedAt;
    }

    await ctx.db.patch(args.paymentId, updateObject);
  },
});

export const deleteByCustomerIdInternal = internalMutation({
  args: {
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_customer_id", (q) => q.eq("customerId", args.customerId))
      .collect();

    for (const payment of payments) {
      await ctx.db.delete(payment._id);
    }
  },
});
