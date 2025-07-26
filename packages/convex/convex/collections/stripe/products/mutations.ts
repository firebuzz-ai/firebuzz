import { v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { internalMutation } from "../../../_generated/server";
import { productSchema } from "./schema";

export const createInternal = internalMutation({
	args: productSchema.validator,
	handler: async (ctx, args) => {
		return await ctx.db.insert("products", args);
	},
});

export const updateInternal = internalMutation({
	args: {
		productId: v.id("products"),
		stripeProductId: v.optional(v.string()),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		active: v.optional(v.boolean()),
		metadata: v.optional(v.record(v.string(), v.any())),
		updatedAt: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const updateObject: Partial<Doc<"products">> = {};

		if (args.stripeProductId) {
			updateObject.stripeProductId = args.stripeProductId;
		}

		if (args.name) {
			updateObject.name = args.name;
		}

		if (args.description) {
			updateObject.description = args.description;
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

		await ctx.db.patch(args.productId, updateObject);
	},
});
