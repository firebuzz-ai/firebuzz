import { defineTable } from "convex/server";
import { v } from "convex/values";

export const workspaceSchema = defineTable(
  v.object({
    externalId: v.optional(v.string()), // Clerk's Organization ID (For Teams)
    workspaceType: v.union(v.literal("personal"), v.literal("team")),
    ownerId: v.id("users"),
    title: v.string(),
    slug: v.optional(v.string()),
    logo: v.optional(v.string()),
    // Stripe
    customerId: v.optional(v.string()), // Stripe Customer ID
    // Flags
    isOnboarded: v.boolean(),
    isSubscribed: v.boolean(), // Whether the workspace is subscribed to paid plan
  })
)
  .index("by_external_id", ["externalId"])
  .index("by_owner_id", ["ownerId"])
  .index("by_stripe_customer_id", ["customerId"])
  .index("by_slug", ["slug"]);
