import { v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";

export const getByStripeEventId = internalQuery({
	args: { stripeEventId: v.string() },
	handler: async (ctx, { stripeEventId }) => {
		return await ctx.db
			.query("webhookEvents")
			.withIndex("by_stripe_event_id", (q) =>
				q.eq("stripeEventId", stripeEventId),
			)
			.unique();
	},
});

export const getUnprocessed = query({
	handler: async (ctx) => {
		return await ctx.db
			.query("webhookEvents")
			.filter((q) => q.eq(q.field("processed"), false))
			.order("desc")
			.collect();
	},
});

export const getByEventType = query({
	args: { eventType: v.string() },
	handler: async (ctx, { eventType }) => {
		return await ctx.db
			.query("webhookEvents")
			.filter((q) => q.eq(q.field("eventType"), eventType))
			.order("desc")
			.collect();
	},
});

export const getRecentEvents = query({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, { limit = 50 }) => {
		return await ctx.db.query("webhookEvents").order("desc").take(limit);
	},
});

export const getByIdInternal = internalQuery({
	args: { id: v.id("webhookEvents") },
	handler: async (ctx, { id }) => {
		return await ctx.db.get(id);
	},
});
