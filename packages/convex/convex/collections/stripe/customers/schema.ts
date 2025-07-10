import { v } from "convex/values";

export const customerSchema = v.object({
	stripeCustomerId: v.string(),
	workspaceId: v.id("workspaces"),
	email: v.string(),
	name: v.optional(v.string()),
	phone: v.optional(v.string()),
	shipping: v.optional(
		v.object({
			address: v.object({
				city: v.optional(v.string()),
				country: v.optional(v.string()),
				line1: v.optional(v.string()),
				line2: v.optional(v.string()),
				postal_code: v.optional(v.string()),
				state: v.optional(v.string()),
			}),
			name: v.optional(v.string()),
			phone: v.optional(v.string()),
		}),
	),
	metadata: v.optional(v.record(v.string(), v.any())), // Stripe metadata as JSON
	updatedAt: v.optional(v.string()), // ISO String for last update
});
