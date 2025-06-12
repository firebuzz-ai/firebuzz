import { v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { internalMutation } from "../../../_generated/server";
import { internalMutationWithTrigger } from "../../../triggers";
import { transactionSchema } from "./schema";

// Helper function to get current period
function getCurrentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

export const createInternal = internalMutationWithTrigger({
  args: transactionSchema,
  handler: async (ctx, args) => {
    return await ctx.db.insert("transactions", args);
  },
});

export const createIdempotent = internalMutationWithTrigger({
  args: {
    ...transactionSchema.fields,
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if transaction already exists
    const existing = await ctx.db
      .query("transactions")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("transactions", args);
  },
});

export const addTrialCredits = internalMutationWithTrigger({
  args: {
    workspaceId: v.id("workspaces"),
    customerId: v.id("customers"),
    amount: v.number(),
    subscriptionId: v.optional(v.id("stripeSubscriptions")),
    expiresAt: v.string(),
    reason: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const currentPeriod = getCurrentPeriod();

    return await ctx.db.insert("transactions", {
      workspaceId: args.workspaceId,
      customerId: args.customerId,
      amount: args.amount,
      type: "trial",
      periodStart: currentPeriod,
      subscriptionId: args.subscriptionId,
      expiresAt: args.expiresAt,
      reason: args.reason || "Trial credits",
      idempotencyKey: args.idempotencyKey,
      updatedAt: now,
    });
  },
});

export const addSubscriptionCredits = internalMutationWithTrigger({
  args: {
    workspaceId: v.id("workspaces"),
    customerId: v.id("customers"),
    amount: v.number(),
    subscriptionId: v.id("stripeSubscriptions"),
    periodStart: v.optional(v.string()),
    reason: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const period = args.periodStart || getCurrentPeriod();

    return await ctx.db.insert("transactions", {
      workspaceId: args.workspaceId,
      customerId: args.customerId,
      amount: args.amount,
      type: "subscription",
      periodStart: period,
      subscriptionId: args.subscriptionId,
      reason: args.reason || "Monthly subscription credits",
      idempotencyKey: args.idempotencyKey,
      updatedAt: now,
    });
  },
});

export const addTopupCredits = internalMutationWithTrigger({
  args: {
    workspaceId: v.id("workspaces"),
    customerId: v.id("customers"),
    amount: v.number(),
    reason: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const currentPeriod = getCurrentPeriod();

    return await ctx.db.insert("transactions", {
      workspaceId: args.workspaceId,
      customerId: args.customerId,
      amount: args.amount,
      type: "topup",
      periodStart: currentPeriod,
      reason: args.reason || "Credit top-up",
      metadata: args.metadata,
      idempotencyKey: args.idempotencyKey,
      updatedAt: now,
    });
  },
});

export const deductCredits = internalMutationWithTrigger({
  args: {
    workspaceId: v.id("workspaces"),
    customerId: v.id("customers"),
    amount: v.number(),
    reason: v.string(),
    metadata: v.optional(v.record(v.string(), v.any())),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const currentPeriod = getCurrentPeriod();

    return await ctx.db.insert("transactions", {
      workspaceId: args.workspaceId,
      customerId: args.customerId,
      amount: -Math.abs(args.amount), // Ensure negative
      type: "usage",
      periodStart: currentPeriod,
      reason: args.reason,
      metadata: args.metadata,
      idempotencyKey: args.idempotencyKey,
      updatedAt: now,
    });
  },
});

export const adjustCredits = internalMutationWithTrigger({
  args: {
    workspaceId: v.id("workspaces"),
    customerId: v.id("customers"),
    amount: v.number(),
    reason: v.string(),
    periodStart: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const period = args.periodStart || getCurrentPeriod();

    return await ctx.db.insert("transactions", {
      workspaceId: args.workspaceId,
      customerId: args.customerId,
      amount: args.amount,
      type: "adjustment",
      periodStart: period,
      reason: args.reason,
      metadata: args.metadata,
      idempotencyKey: args.idempotencyKey,
      updatedAt: now,
    });
  },
});

export const expireTrialCredits = internalMutationWithTrigger({
  args: {
    workspaceId: v.id("workspaces"),
    subscriptionId: v.optional(v.id("stripeSubscriptions")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Find trial credits for this workspace that haven't expired yet
    const trialCredits = await ctx.db
      .query("transactions")
      .withIndex("by_workspace_id", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "trial"),
          q.or(
            q.eq(q.field("expiresAt"), undefined),
            q.gt(q.field("expiresAt"), now)
          )
        )
      )
      .collect();

    // Set expiration to now (effectively expiring them)
    for (const credit of trialCredits) {
      await ctx.db.patch(credit._id, {
        expiresAt: now,
        updatedAt: now,
      });
    }

    return trialCredits.length;
  },
});

export const revokeCredits = internalMutationWithTrigger({
  args: {
    workspaceId: v.id("workspaces"),
    customerId: v.id("customers"),
    amount: v.number(),
    reason: v.string(),
    subscriptionId: v.optional(v.id("stripeSubscriptions")),
    periodStart: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const period = args.periodStart || getCurrentPeriod();

    return await ctx.db.insert("transactions", {
      workspaceId: args.workspaceId,
      customerId: args.customerId,
      amount: -Math.abs(args.amount), // Ensure negative
      type: "refund",
      periodStart: period,
      subscriptionId: args.subscriptionId,
      reason: args.reason,
      updatedAt: now,
    });
  },
});

export const updateInternal = internalMutation({
  args: {
    transactionId: v.id("transactions"),
    expiresAt: v.optional(v.string()),
    reason: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const updateObject: Partial<Doc<"transactions">> = {
      updatedAt: new Date().toISOString(),
    };

    if (args.expiresAt !== undefined) {
      updateObject.expiresAt = args.expiresAt;
    }

    if (args.reason) {
      updateObject.reason = args.reason;
    }

    if (args.metadata) {
      updateObject.metadata = args.metadata;
    }

    await ctx.db.patch(args.transactionId, updateObject);
  },
});

export const deleteInternal = internalMutationWithTrigger({
  args: {
    transactionId: v.id("transactions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.transactionId);
  },
});
