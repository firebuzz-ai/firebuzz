import { defineTable } from "convex/server";
import { v } from "convex/values";

export const subscriptionMetadataSchema = v.union(
  v.object({
    isShadow: v.literal("true"),
    parentSubscription: v.string(),
    createdAt: v.string(),
  }),
  v.object({
    isShadow: v.literal("false"),
  })
);

export const subscriptionSchema = defineTable(
  v.object({
    stripeSubscriptionId: v.string(),
    customerId: v.id("customers"), // Reference to customers table
    workspaceId: v.id("workspaces"),
    status: v.union(
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("trialing"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("unpaid"),
      v.literal("paused")
    ),
    currentPeriodStart: v.string(),
    currentPeriodEnd: v.string(),
    cancelAtPeriodEnd: v.boolean(),
    interval: v.union(
      v.literal("month"),
      v.literal("year"),
      v.literal("week"),
      v.literal("day")
    ),
    canceledAt: v.optional(v.string()),
    trialStart: v.optional(v.string()),
    trialEnd: v.optional(v.string()),
    metadata: v.optional(subscriptionMetadataSchema), // Stripe metadata as JSON
    updatedAt: v.optional(v.string()), // ISO String for last update
  })
)
  .index("by_workspace_id", ["workspaceId"])
  .index("by_customer_id", ["customerId"])
  .index("by_stripe_subscription_id", ["stripeSubscriptionId"]);
