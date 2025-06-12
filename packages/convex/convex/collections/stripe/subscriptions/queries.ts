import { v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";

export const getByStripeId = internalQuery({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, { stripeSubscriptionId }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId)
      )
      .unique();
  },
});

export const getByCustomerId = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_customer_id", (q) => q.eq("customerId", customerId))
      .collect();
  },
});

export const getByWorkspaceId = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId))
      .collect();
  },
});

export const getActiveByWorkspaceId = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    return await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("workspaceId"), workspaceId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

export const getByIdInternal = internalQuery({
  args: { id: v.id("subscriptions") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});
