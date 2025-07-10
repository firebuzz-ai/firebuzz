import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import type { Doc } from "../../../_generated/dataModel";
import { internalMutation } from "../../../_generated/server";
import { internalMutationWithTrigger } from "../../../triggers";
import { customerSchema } from "./schema";

export const createInternal = internalMutation({
	args: customerSchema,
	handler: async (ctx, args) => {
		return await ctx.db.insert("customers", args);
	},
});

export const updateInternal = internalMutation({
	args: {
		customerId: v.id("customers"),
		stripeCustomerId: v.optional(v.string()),
		workspaceId: v.optional(v.id("workspaces")),
		email: v.optional(v.string()),
		name: v.optional(v.string()),
		metadata: v.optional(v.record(v.string(), v.any())),
		updatedAt: v.optional(v.string()),
		shipping: customerSchema.fields.shipping,
	},
	handler: async (ctx, args) => {
		const updateObject: Partial<Doc<"customers">> = {};

		if (args.stripeCustomerId) {
			updateObject.stripeCustomerId = args.stripeCustomerId;
		}

		if (args.workspaceId) {
			updateObject.workspaceId = args.workspaceId;
		}

		if (args.email) {
			updateObject.email = args.email;
		}

		if (args.name) {
			updateObject.name = args.name;
		}

		if (args.metadata) {
			updateObject.metadata = args.metadata;
		}

		if (args.updatedAt) {
			updateObject.updatedAt = args.updatedAt;
		}

		if (args.shipping) {
			updateObject.shipping = args.shipping;
		}

		await ctx.db.patch(args.customerId, updateObject);
	},
});

export const deletePermanentInternal = internalMutationWithTrigger({
	args: {
		customerId: v.id("customers"),
	},
	handler: async (ctx, args) => {
		await ctx.db.delete(args.customerId);
	},
});

export const deleteByWorkspaceIdInternal = internalMutationWithTrigger({
	args: {
		workspaceId: v.id("workspaces"),
	},
	handler: async (ctx, args) => {
		const customer = await ctx.runQuery(
			internal.collections.stripe.customers.queries.getByWorkspaceId,
			{ workspaceId: args.workspaceId },
		);

		if (!customer) {
			return;
		}

		await ctx.db.delete(customer._id);
	},
});
