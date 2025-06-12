import { v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";

export const getByStripeId = internalQuery({
  args: { stripePaymentMethodId: v.string() },
  handler: async (ctx, { stripePaymentMethodId }) => {
    return await ctx.db
      .query("paymentMethods")
      .withIndex("by_stripe_payment_method_id", (q) =>
        q.eq("stripePaymentMethodId", stripePaymentMethodId)
      )
      .unique();
  },
});

export const getByCustomerId = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    return await ctx.db
      .query("paymentMethods")
      .withIndex("by_customer_id", (q) => q.eq("customerId", customerId))
      .collect();
  },
});

export const getByWorkspaceId = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    return await ctx.db
      .query("paymentMethods")
      .withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId))
      .collect();
  },
});

export const getDefaultByCustomerId = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    return await ctx.db
      .query("paymentMethods")
      .filter((q) => q.eq(q.field("customerId"), customerId))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .unique();
  },
});

export const getByIdInternal = internalQuery({
  args: { id: v.id("paymentMethods") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});
