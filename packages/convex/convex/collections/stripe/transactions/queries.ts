import { v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";

export const getByWorkspaceId = query({
  args: {
    workspaceId: v.id("workspaces"),
    periodStart: v.optional(v.string()),
    type: v.optional(v.string()),
    includeExpired: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { workspaceId, periodStart, type, includeExpired = false }
  ) => {
    let query = ctx.db
      .query("transactions")
      .withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId));

    if (periodStart) {
      query = query.filter((q) => q.eq(q.field("periodStart"), periodStart));
    }

    if (type) {
      query = query.filter((q) => q.eq(q.field("type"), type));
    }

    if (!includeExpired) {
      const now = new Date().toISOString();
      query = query.filter((q) =>
        q.or(
          q.eq(q.field("expiresAt"), undefined),
          q.gt(q.field("expiresAt"), now)
        )
      );
    }

    return await query.collect();
  },
});

export const getByWorkspaceIdInternal = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
    periodStart: v.optional(v.string()),
    type: v.optional(v.string()),
    includeExpired: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { workspaceId, periodStart, type, includeExpired = false }
  ) => {
    let query = ctx.db
      .query("transactions")
      .withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId));

    if (periodStart) {
      query = query.filter((q) => q.eq(q.field("periodStart"), periodStart));
    }

    if (type) {
      query = query.filter((q) => q.eq(q.field("type"), type));
    }

    if (!includeExpired) {
      const now = new Date().toISOString();
      query = query.filter((q) =>
        q.or(
          q.eq(q.field("expiresAt"), undefined),
          q.gt(q.field("expiresAt"), now)
        )
      );
    }

    return await query.collect();
  },
});

export const getBySubscriptionId = internalQuery({
  args: { subscriptionId: v.id("stripeSubscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_subscription_id", (q) =>
        q.eq("subscriptionId", subscriptionId)
      )
      .collect();
  },
});

export const getByIdempotencyKey = internalQuery({
  args: { idempotencyKey: v.string() },
  handler: async (ctx, { idempotencyKey }) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", idempotencyKey)
      )
      .unique();
  },
});

export const getExpiredTrialCredits = internalQuery({
  args: { beforeDate: v.string() },
  handler: async (ctx, { beforeDate }) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_type_expires", (q) =>
        q.eq("type", "trial").lt("expiresAt", beforeDate)
      )
      .collect();
  },
});

export const getByIdInternal = internalQuery({
  args: { id: v.id("transactions") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});
