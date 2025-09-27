import { v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";
import {
  aggregateCreditsBalance,
  aggregateCurrentPeriodAdditions,
  aggregateCurrentPeriodUsage,
} from "../../../components/aggregates";
import {
  getCurrentShadowSubscription,
  getCurrentSubscription,
} from "../subscriptions/utils";

export const getCurrentBalance = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, { workspaceId }) => {
    // Get current subscription to determine period boundaries
    const subscription = await getCurrentSubscription(ctx, workspaceId);

    if (!subscription) {
      // No subscription = no credits
      return 0;
    }

    const shadowSubscription = await getCurrentShadowSubscription(
      ctx,
      workspaceId
    );

    const periodEnd =
      shadowSubscription?.currentPeriodEnd || subscription.currentPeriodEnd;

    // Get current time to filter out expired credits
    const now = new Date().toISOString();

    // Calculate balance using only non-expired credits
    const balance = await aggregateCreditsBalance.sum(ctx, {
      namespace: workspaceId,
      bounds: {
        lower: { key: [now, 0], inclusive: false }, // Exclude credits that expire before now
        upper: {
          key: [periodEnd, Number.MAX_SAFE_INTEGER],
          inclusive: true,
        }, // Include all future credits
      },
    });

    return Math.round(balance || 0);
  },
});

export const getCurrentBalanceInternal = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, { workspaceId }) => {
    // Get current subscription to determine period boundaries
    const subscription = await getCurrentSubscription(ctx, workspaceId);

    if (!subscription) {
      // No subscription = no credits
      return 0;
    }

    const shadowSubscription = await getCurrentShadowSubscription(
      ctx,
      workspaceId
    );

    const periodEnd =
      shadowSubscription?.currentPeriodEnd || subscription.currentPeriodEnd;

    // Get current time to filter out expired credits
    const now = new Date().toISOString();

    // Calculate balance using only non-expired credits
    const balance = await aggregateCreditsBalance.sum(ctx, {
      namespace: workspaceId,
      bounds: {
        lower: { key: [now, 0], inclusive: false }, // Exclude credits that expire before now
        upper: {
          key: [periodEnd, Number.MAX_SAFE_INTEGER],
          inclusive: true,
        }, // Include all future credits
      },
    });

    return Math.round(balance || 0);
  },
});

export const validateSufficientCredits = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
    requiredCredits: v.number(),
  },
  handler: async (ctx, { workspaceId, requiredCredits }) => {
    // Get current subscription to determine period boundaries
    const subscription = await getCurrentSubscription(ctx, workspaceId);

    if (!subscription) {
      // No subscription = no credits
      return {
        hasEnough: false,
        currentBalance: 0,
        requiredCredits,
        shortfall: requiredCredits,
      };
    }

    // Get current time to filter out expired credits
    const now = new Date().toISOString();

    // Calculate balance using only non-expired credits
    const balance = await aggregateCreditsBalance.sum(ctx, {
      namespace: workspaceId,
      bounds: {
        lower: { key: [now, 0], inclusive: false }, // Exclude credits that expire before now
        upper: {
          key: ["9999-12-31", Number.MAX_SAFE_INTEGER],
          inclusive: true,
        }, // Include all future credits
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
    periodEnd: v.string(), // ISO string (expiresAt)
  },
  handler: async (ctx, { workspaceId, periodEnd }) => {
    // Get usage for the current period by filtering by expiresAt (periodEnd)
    const usage = await aggregateCurrentPeriodUsage.sum(ctx, {
      namespace: workspaceId,
      bounds: {
        lower: { key: [periodEnd, 0], inclusive: true },
        upper: {
          key: [periodEnd, Number.MAX_SAFE_INTEGER],
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
    periodEnd: v.string(), // ISO string (expiresAt)
  },
  handler: async (ctx, { workspaceId, periodEnd }) => {
    // Get additions for the current period by filtering by expiresAt (periodEnd)
    const additions = await aggregateCurrentPeriodAdditions.sum(ctx, {
      namespace: workspaceId,
      bounds: {
        lower: { key: [periodEnd, 0], inclusive: true },
        upper: {
          key: [periodEnd, Number.MAX_SAFE_INTEGER],
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
    periodEnd: v.string(), // ISO string (expiresAt)
    periodStart: v.string(), // ISO string (periodStart)
  },
  handler: async (ctx, { workspaceId, periodEnd, periodStart }) => {
    // Get both usage and additions for the period in parallel
    const [usage, additions] = await Promise.all([
      // Usage now uses the new format: [expiresAt, _creationTime]
      aggregateCurrentPeriodUsage.sum(ctx, {
        namespace: workspaceId,
        bounds: {
          lower: { key: [periodEnd, 0], inclusive: true },
          upper: {
            key: [periodEnd, Number.MAX_SAFE_INTEGER],
            inclusive: true,
          },
        },
      }),
      // Additions uses the new format: [expiresAt, _creationTime]
      aggregateCurrentPeriodAdditions.sum(ctx, {
        namespace: workspaceId,
        bounds: {
          lower: { key: [periodEnd, 0], inclusive: true },
          upper: {
            key: [periodEnd, Number.MAX_SAFE_INTEGER],
            inclusive: true,
          },
        },
      }),
    ]);

    return {
      periodStart, // For backward compatibility in response
      periodEnd,
      usage: Math.abs(usage || 0), // Return as positive number
      additions: Math.round(additions || 0),
    };
  },
});
