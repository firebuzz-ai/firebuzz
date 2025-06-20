import { v } from "convex/values";

export const customerSchema = v.object({
	stripeCustomerId: v.string(),
	workspaceId: v.id("workspaces"),
	email: v.string(),
	name: v.optional(v.string()),
	metadata: v.optional(v.record(v.string(), v.any())), // Stripe metadata as JSON
	updatedAt: v.optional(v.string()), // ISO String for last update
});
