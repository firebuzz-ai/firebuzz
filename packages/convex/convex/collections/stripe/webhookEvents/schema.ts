import { v } from "convex/values";

export const webhookEventSchema = v.object({
  stripeEventId: v.string(),
  eventType: v.string(), // e.g., "customer.subscription.updated"
  processed: v.boolean(),
  data: v.any(), // Full webhook event data as JSON
  attempts: v.number(), // Number of processing attempts
  lastError: v.optional(v.string()), // Last error message if processing failed
});
