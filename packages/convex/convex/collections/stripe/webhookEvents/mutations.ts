import { v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { internalMutation } from "../../../_generated/server";
import { webhookEventSchema } from "./schema";

export const createInternal = internalMutation({
  args: webhookEventSchema.validator,
  handler: async (ctx, args) => {
    return await ctx.db.insert("webhookEvents", args);
  },
});

export const updateInternal = internalMutation({
  args: {
    webhookEventId: v.id("webhookEvents"),
    stripeEventId: v.optional(v.string()),
    eventType: v.optional(v.string()),
    processed: v.optional(v.boolean()),
    data: v.optional(v.any()),
    attempts: v.optional(v.number()),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updateObject: Partial<Doc<"webhookEvents">> = {};

    if (args.stripeEventId) {
      updateObject.stripeEventId = args.stripeEventId;
    }

    if (args.eventType) {
      updateObject.eventType = args.eventType;
    }

    if (args.processed !== undefined) {
      updateObject.processed = args.processed;
    }

    if (args.data) {
      updateObject.data = args.data;
    }

    if (args.attempts) {
      updateObject.attempts = args.attempts;
    }

    if (args.lastError) {
      updateObject.lastError = args.lastError;
    }

    await ctx.db.patch(args.webhookEventId, updateObject);
  },
});
