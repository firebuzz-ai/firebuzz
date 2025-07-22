import { defineTable } from "convex/server";
import { v } from "convex/values";

export const taxIdSchema = defineTable(
  v.object({
    taxId: v.string(),
    customerId: v.id("customers"),
    country: v.optional(v.string()),
    type: v.optional(v.string()),
    value: v.string(),
    verification: v.optional(
      v.object({
        status: v.union(
          v.literal("pending"),
          v.literal("verified"),
          v.literal("unverified"),
          v.literal("unavailable")
        ),
        verifiedAddress: v.optional(v.string()),
        verifiedName: v.optional(v.string()),
      })
    ),
    updatedAt: v.string(),
  })
)
  .index("by_customer_id", ["customerId"])
  .index("by_taxId", ["taxId"]);
