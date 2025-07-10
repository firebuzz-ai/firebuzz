import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";
import { ERRORS } from "../../../utils/errors";
import { getCurrentUserWithWorkspace } from "../../users/utils";

export const getByStripeId = internalQuery({
	args: { stripeCustomerId: v.string() },
	handler: async (ctx, { stripeCustomerId }) => {
		return await ctx.db
			.query("customers")
			.withIndex("by_stripe_customer_id", (q) =>
				q.eq("stripeCustomerId", stripeCustomerId),
			)
			.unique();
	},
});

export const getByWorkspaceId = internalQuery({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, { workspaceId }) => {
		return await ctx.db
			.query("customers")
			.withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId))
			.unique();
	},
});

// Public query for billing components to get customer by workspace ID
export const getByWorkspaceIdPublic = query({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, { workspaceId }) => {
		return await ctx.db
			.query("customers")
			.withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId))
			.unique();
	},
});

export const getByIdInternal = internalQuery({
	args: { id: v.id("customers") },
	handler: async (ctx, { id }) => {
		return await ctx.db.get(id);
	},
});

export const getBillingDataByWorkspaceId = query({
	handler: async (ctx) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		if (!user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const workspace = await ctx.db.get(user.currentWorkspaceId);

		if (!workspace) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Get customer
		const customer = await ctx.db
			.query("customers")
			.withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspace._id))
			.unique();

		if (!customer) {
			return {
				customer: null,
				paymentMethods: [],
				taxIds: [],
				invoices: [],
			};
		}

		// Get payment methods
		const paymentMethods = await ctx.db
			.query("paymentMethods")
			.withIndex("by_customer_id", (q) => q.eq("customerId", customer._id))
			.collect();

		// Get tax IDs
		const taxIds = await ctx.db
			.query("taxIds")
			.withIndex("by_customer_id", (q) => q.eq("customerId", customer._id))
			.collect();

		// Get invoices (most recent first)
		const invoices = await ctx.db
			.query("invoices")
			.withIndex("by_customer_id", (q) => q.eq("customerId", customer._id))
			.order("desc")
			.collect();

		return {
			customer,
			paymentMethods,
			taxIds,
			invoices,
		};
	},
});
