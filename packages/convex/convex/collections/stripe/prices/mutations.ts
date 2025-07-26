import { v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { internalMutation } from "../../../_generated/server";
import { priceSchema } from "./schema";

export const createInternal = internalMutation({
	args: priceSchema.validator,
	handler: async (ctx, args) => {
		return await ctx.db.insert("prices", args);
	},
});

export const updateInternal = internalMutation({
	args: {
		priceId: v.id("prices"),
		stripePriceId: v.optional(v.string()),
		productId: v.optional(v.id("products")),
		unitAmount: v.optional(v.number()),
		currency: v.optional(v.string()),
		interval: v.optional(
			v.union(
				v.literal("day"),
				v.literal("week"),
				v.literal("month"),
				v.literal("year"),
			),
		),
		intervalCount: v.optional(v.number()),
		type: v.optional(v.union(v.literal("one_time"), v.literal("recurring"))),
		active: v.optional(v.boolean()),
		metadata: v.optional(v.record(v.string(), v.any())),
		updatedAt: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const updateObject: Partial<Doc<"prices">> = {};

		if (args.stripePriceId) {
			updateObject.stripePriceId = args.stripePriceId;
		}

		if (args.productId) {
			updateObject.productId = args.productId;
		}

		if (args.unitAmount) {
			updateObject.unitAmount = args.unitAmount;
		}

		if (args.currency) {
			updateObject.currency = args.currency;
		}

		if (args.interval) {
			updateObject.interval = args.interval;
		}

		if (args.intervalCount) {
			updateObject.intervalCount = args.intervalCount;
		}

		if (args.type) {
			updateObject.type = args.type;
		}

		if (args.active !== undefined) {
			updateObject.active = args.active;
		}

		if (args.metadata) {
			updateObject.metadata = args.metadata;
		}

		if (args.updatedAt) {
			updateObject.updatedAt = args.updatedAt;
		}

		await ctx.db.patch(args.priceId, updateObject);
	},
});
