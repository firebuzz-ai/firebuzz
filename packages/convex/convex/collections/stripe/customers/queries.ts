import { v } from "convex/values";
import { internalQuery } from "../../../_generated/server";

export const getByStripeId = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", stripeCustomerId)
      )
      .unique();
  },
});

export const getByWorkspaceId = internalQuery({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId))
      .unique();
  },
});

export const getByIdInternal = internalQuery({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});
