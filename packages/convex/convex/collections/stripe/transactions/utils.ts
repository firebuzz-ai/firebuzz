import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import {
  internalMutation,
  internalQuery,
  query,
} from "../../../_generated/server";
import { aggregateCredits } from "../../../components/aggregates";
import { cascadePool } from "../../../components/workpools";

// Helper function to get current period
function getCurrentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

export const getCurrentBalance = query({
  args: {
    workspaceId: v.id("workspaces"),
    periodStart: v.optional(v.string()),
  },
  handler: async (ctx, { workspaceId, periodStart }) => {
    const period = periodStart || getCurrentPeriod();

    // Get credits for the specific period
    const credits = await aggregateCredits.sum(ctx, {
      namespace: workspaceId,
      bounds: {
        lower: { key: [period, 0], inclusive: true },
        upper: { key: [period, Date.now()], inclusive: true },
      },
    });

    return Math.round(credits || 0);
  },
});

export const getCurrentBalanceInternal = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
    periodStart: v.optional(v.string()),
  },
  handler: async (ctx, { workspaceId, periodStart }) => {
    const period = periodStart || getCurrentPeriod();

    // Get credits for the specific period
    const credits = await aggregateCredits.sum(ctx, {
      namespace: workspaceId,
      bounds: {
        lower: { key: [period, 0], inclusive: true },
        upper: { key: [period, Date.now()], inclusive: true },
      },
    });

    return Math.round(credits || 0);
  },
});

export const getAllTimeBalance = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    // Get all credits for this workspace
    const credits = await aggregateCredits.sum(ctx, {
      namespace: workspaceId,
      bounds: {}, // Empty bounds to get all records
    });

    return Math.round(credits || 0);
  },
});

export const getBalanceBreakdown = query({
  args: {
    workspaceId: v.id("workspaces"),
    periodStart: v.optional(v.string()),
  },
  handler: async (ctx, { workspaceId, periodStart }) => {
    const period = periodStart || getCurrentPeriod();
    const now = new Date().toISOString();

    // Get all credits for the period that haven't expired
    const allCredits = await ctx.db
      .query("transactions")
      .withIndex("by_workspace_period", (q) =>
        q.eq("workspaceId", workspaceId).eq("periodStart", period)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("expiresAt"), undefined), // Never expires
          q.gt(q.field("expiresAt"), now) // Not yet expired
        )
      )
      .collect();

    // Separate by credit type
    const trialCredits = allCredits
      .filter((credit) => credit.type === "trial")
      .reduce((sum, credit) => sum + credit.amount, 0);

    const subscriptionCredits = allCredits
      .filter((credit) => credit.type === "subscription")
      .reduce((sum, credit) => sum + credit.amount, 0);

    const topupCredits = allCredits
      .filter((credit) => credit.type === "topup")
      .reduce((sum, credit) => sum + credit.amount, 0);

    const giftCredits = allCredits
      .filter((credit) => credit.type === "gift")
      .reduce((sum, credit) => sum + credit.amount, 0);

    const usageCredits = allCredits
      .filter((credit) => credit.type === "usage")
      .reduce((sum, credit) => sum + credit.amount, 0);

    const adjustmentCredits = allCredits
      .filter((credit) => credit.type === "adjustment")
      .reduce((sum, credit) => sum + credit.amount, 0);

    const refundCredits = allCredits
      .filter((credit) => credit.type === "refund")
      .reduce((sum, credit) => sum + credit.amount, 0);

    const total =
      trialCredits +
      subscriptionCredits +
      topupCredits +
      giftCredits +
      usageCredits +
      adjustmentCredits +
      refundCredits;

    return {
      total: Math.round(total),
      breakdown: {
        trial: Math.round(trialCredits),
        subscription: Math.round(subscriptionCredits),
        topup: Math.round(topupCredits),
        gift: Math.round(giftCredits),
        usage: Math.round(usageCredits),
        adjustment: Math.round(adjustmentCredits),
        refund: Math.round(refundCredits),
      },
      period,
      isInTrial: trialCredits > 0,
    };
  },
});

export const validateSufficientCredits = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
    requiredCredits: v.number(),
    periodStart: v.optional(v.string()),
  },
  handler: async (ctx, { workspaceId, requiredCredits, periodStart }) => {
    const period = periodStart || getCurrentPeriod();

    // Get credits for the specific period
    const currentBalance = await aggregateCredits.sum(ctx, {
      namespace: workspaceId,
      bounds: {
        lower: { key: [period, 0], inclusive: true },
        upper: { key: [period, Date.now()], inclusive: true },
      },
    });

    const balance = Math.round(currentBalance || 0);

    return {
      hasEnough: balance >= requiredCredits,
      currentBalance: balance,
      requiredCredits,
      shortfall: Math.max(0, requiredCredits - balance),
    };
  },
});

export const getCreditHistory = query({
  args: {
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
    periodStart: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, { workspaceId, limit = 50, periodStart, type }) => {
    let query = ctx.db
      .query("transactions")
      .withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId))
      .order("desc");

    if (periodStart) {
      query = query.filter((q) => q.eq(q.field("periodStart"), periodStart));
    }

    if (type) {
      query = query.filter((q) => q.eq(q.field("type"), type));
    }

    return await query.take(limit);
  },
});

export const batchDelete = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    customerId: v.id("customers"),
    numItems: v.number(),
  },
  handler: async (ctx, { customerId, cursor, numItems }) => {
    const { page, continueCursor } = await ctx.db
      .query("transactions")
      .withIndex("by_customer_id", (q) => q.eq("customerId", customerId))
      .paginate({ numItems, cursor: cursor ?? null });

    // If there are no media items, return
    if (page.length === 0) {
      return;
    }

    // Delete the transcations
    await asyncMap(page, (transaction) =>
      ctx.runMutation(
        internal.collections.stripe.transactions.mutations.deleteInternal,
        { transactionId: transaction._id }
      )
    );

    // Continue deleting media items if there are more
    if (
      continueCursor &&
      continueCursor !== cursor &&
      page.length === numItems
    ) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.stripe.transactions.utils.batchDelete,
        {
          customerId,
          cursor: continueCursor,
          numItems,
        }
      );
    }
  },
});
