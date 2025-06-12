import { v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { internalMutation } from "../../../_generated/server";
import { subscriptionSchema } from "./schema";
import { internalMutationWithTrigger } from "../../../triggers";

export const createInternal = internalMutation({
  args: subscriptionSchema,
  handler: async (ctx, args) => {
    return await ctx.db.insert("subscriptions", args);
  },
});

export const updateInternal = internalMutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    stripeSubscriptionId: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    workspaceId: v.optional(v.id("workspaces")),
    status: v.optional(
      v.union(
        v.literal("incomplete"),
        v.literal("incomplete_expired"),
        v.literal("trialing"),
        v.literal("active"),
        v.literal("past_due"),
        v.literal("canceled"),
        v.literal("unpaid"),
        v.literal("paused")
      )
    ),
    currentPeriodStart: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.string()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    canceledAt: v.optional(v.string()),
    trialStart: v.optional(v.string()),
    trialEnd: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
    updatedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updateObject: Partial<Doc<"subscriptions">> = {};

    if (args.stripeSubscriptionId) {
      updateObject.stripeSubscriptionId = args.stripeSubscriptionId;
    }

    if (args.customerId) {
      updateObject.customerId = args.customerId;
    }

    if (args.workspaceId) {
      updateObject.workspaceId = args.workspaceId;
    }

    if (args.status) {
      updateObject.status = args.status;
    }

    if (args.currentPeriodStart) {
      updateObject.currentPeriodStart = args.currentPeriodStart;
    }

    if (args.currentPeriodEnd) {
      updateObject.currentPeriodEnd = args.currentPeriodEnd;
    }

    if (args.cancelAtPeriodEnd !== undefined) {
      updateObject.cancelAtPeriodEnd = args.cancelAtPeriodEnd;
    }

    if (args.canceledAt) {
      updateObject.canceledAt = args.canceledAt;
    }

    if (args.trialStart) {
      updateObject.trialStart = args.trialStart;
    }

    if (args.trialEnd) {
      updateObject.trialEnd = args.trialEnd;
    }

    if (args.metadata) {
      updateObject.metadata = args.metadata;
    }

    if (args.updatedAt) {
      updateObject.updatedAt = args.updatedAt;
    }

    await ctx.db.patch(args.subscriptionId, updateObject);
  },
});

export const deleteByCustomerIdInternal = internalMutationWithTrigger({
  args: {
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_customer_id", (q) => q.eq("customerId", args.customerId))
      .collect();

    for (const subscription of subscriptions) {
      await ctx.db.delete(subscription._id);
    }
  },
});
