import { v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { getCurrentUser } from "../users/utils";
import { getWorkspacesByExternalIds } from "./utils";

export const getCurrent = query({
	handler: async (ctx) => {
		// Check if user is authenticated
		const user = await getCurrentUser(ctx);

		if (!user.currentWorkspaceId) {
			return null;
		}

		const workspace = await ctx.db.get(user.currentWorkspaceId);

		if (!workspace) {
			return null;
		}

		const owner = await ctx.db.get(workspace.ownerId);

		return {
			...workspace,
			owner,
		};
	},
});

export const getAll = query({
	args: {
		externalIds: v.array(v.string()),
	},
	handler: async (ctx, { externalIds }) => {
		// Check if user is authenticated
		const user = await getCurrentUser(ctx);

		// Get all workspaces by external ids
		const workspaces = await getWorkspacesByExternalIds(ctx, [
			...externalIds,
			user.externalId,
		]);

		// Owned workspaces
		const ownedWorkspaces = await ctx.db
			.query("workspaces")
			.withIndex("by_owner_id", (q) => q.eq("ownerId", user._id))
			.collect();

		// Return all workspaces (unique)
		return [...workspaces, ...ownedWorkspaces].filter(
			(workspace, index, self) =>
				workspace?._id &&
				self.findIndex((t) => t._id === workspace._id) === index,
		);
	},
});

export const getByIdInternal = internalQuery({
	args: { id: v.id("workspaces") },
	handler: async (ctx, { id }) => {
		return await ctx.db.get(id);
	},
});

export const getByExternalIdInternal = internalQuery({
	args: { externalId: v.string() },
	handler: async (ctx, { externalId }) => {
		return await ctx.db
			.query("workspaces")
			.withIndex("by_external_id", (q) => q.eq("externalId", externalId))
			.first();
	},
});

export const getByStripeCustomerId = internalQuery({
	args: { stripeCustomerId: v.string() },
	handler: async (ctx, { stripeCustomerId }) => {
		return await ctx.db
			.query("workspaces")
			.withIndex("by_stripe_customer_id", (q) =>
				q.eq("customerId", stripeCustomerId),
			)
			.first();
	},
});
