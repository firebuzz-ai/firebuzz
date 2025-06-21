import { v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";
import {
  aggregateCreditsBalance,
  aggregateCurrentPeriodAdditions,
  aggregateCurrentPeriodUsage,
} from "../../../components/aggregates";

export const getCurrentBalance = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, { workspaceId }) => {
    const now = new Date().toISOString();

    // Use bounds to efficiently scan only non-expired credits
    // Since sortKey is [expiresAt || "9999-12-31", _creationTime]
    const credits = await aggregateCreditsBalance.sum(ctx, {
      namespace: workspaceId,
      bounds: {
        lower: { key: [now, 0], inclusive: false }, // Exclude expired credits
        upper: { key: ["9999-12-31", Date.now()], inclusive: true }, // Include all future credits
      },
    });

    return Math.round(credits || 0);
  },
});

export const getCurrentBalanceInternal = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, { workspaceId }) => {
    const now = new Date().toISOString();

    // Use bounds to efficiently scan only non-expired credits
    const credits = await aggregateCreditsBalance.sum(ctx, {
      namespace: workspaceId,
      bounds: {
        lower: { key: [now, 0], inclusive: false }, // Exclude expired credits
        upper: { key: ["9999-12-31", Date.now()], inclusive: true }, // Include all future credits
      },
    });

    return Math.round(credits || 0);
  },
});

export const validateSufficientCredits = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
    requiredCredits: v.number(),
  },
  handler: async (ctx, { workspaceId, requiredCredits }) => {
    const now = new Date().toISOString();

    // Use bounds to efficiently scan only non-expired credits
    const balance = await aggregateCreditsBalance.sum(ctx, {
      namespace: workspaceId,
      bounds: {
        lower: { key: [now, 0], inclusive: false }, // Exclude expired credits
        upper: { key: ["9999-12-31", Date.now()], inclusive: true }, // Include all future credits
      },
    });

    const currentBalance = Math.round(balance || 0);

    return {
      hasEnough: currentBalance >= requiredCredits,
      currentBalance,
      requiredCredits,
      shortfall: Math.max(0, requiredCredits - currentBalance),
    };
  },
});

export const getCurrentPeriodUsage = query({
  args: {
    workspaceId: v.id("workspaces"),
    periodStart: v.string(), // "YYYY-MM" format
    periodEnd: v.string(), // ISO string (expiresAt)
  },
  handler: async (ctx, { workspaceId, periodStart, periodEnd }) => {
    // Get usage for the specific period range
    const usage = await aggregateCurrentPeriodUsage.sum(ctx, {
      namespace: workspaceId,
      bounds: {
        lower: { key: [periodStart, periodEnd, 0], inclusive: true },
        upper: {
          key: [periodStart, periodEnd, Number.MAX_SAFE_INTEGER],
          inclusive: true,
        },
      },
    });

    return Math.abs(Math.round(usage || 0)); // Return as positive number
  },
});

export const getCurrentPeriodAdditions = query({
  args: {
    workspaceId: v.id("workspaces"),
    periodStart: v.string(), // "YYYY-MM" format
    periodEnd: v.string(), // ISO string (expiresAt)
  },
  handler: async (ctx, { workspaceId, periodStart, periodEnd }) => {
    // Get additions for the specific period range
    const additions = await aggregateCurrentPeriodAdditions.sum(ctx, {
      namespace: workspaceId,
      bounds: {
        lower: { key: [periodStart, periodEnd, 0], inclusive: true },
        upper: {
          key: [periodStart, periodEnd, Number.MAX_SAFE_INTEGER],
          inclusive: true,
        },
      },
    });

    return Math.round(additions || 0);
  },
});

export const getCurrentPeriodSummary = query({
  args: {
    workspaceId: v.id("workspaces"),
    periodStart: v.string(), // ISO string
    periodEnd: v.string(), // ISO string (expiresAt)
  },
  handler: async (ctx, { workspaceId, periodStart, periodEnd }) => {
    // Get both usage and additions for the period in parallel
    const [usage, additions] = await Promise.all([
      aggregateCurrentPeriodUsage.sum(ctx, {
        namespace: workspaceId,
        bounds: {
          lower: { key: [periodStart, periodEnd, 0], inclusive: true },
          upper: {
            key: [periodStart, periodEnd, Number.MAX_SAFE_INTEGER],
            inclusive: true,
          },
        },
      }),
      aggregateCurrentPeriodAdditions.sum(ctx, {
        namespace: workspaceId,
        bounds: {
          lower: { key: [periodStart, periodEnd, 0], inclusive: true },
          upper: {
            key: [periodStart, periodEnd, Number.MAX_SAFE_INTEGER],
            inclusive: true,
          },
        },
      }),
    ]);

    return {
      periodStart,
      periodEnd,
      usage: Math.abs(Math.round(usage || 0)), // Return as positive number
      additions: Math.round(additions || 0),
    };
  },
});
