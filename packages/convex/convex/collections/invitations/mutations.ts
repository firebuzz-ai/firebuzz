import { ConvexError, v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { ERRORS } from "../../utils/errors";

export const createInternal = internalMutation({
	args: {
		email: v.string(),
		role: v.union(v.literal("org:admin"), v.literal("org:member")),
		workspaceId: v.id("workspaces"),
		invitedBy: v.id("users"),
		externalId: v.string(),
		organizationExternalId: v.string(),
		status: v.union(
			v.literal("pending"),
			v.literal("accepted"),
			v.literal("revoked"),
		),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("invitations", {
			email: args.email,
			role: args.role,
			workspaceId: args.workspaceId,
			invitedBy: args.invitedBy,
			externalId: args.externalId,
			organizationExternalId: args.organizationExternalId,
			updatedAt: new Date().toISOString(),
			status: args.status,
		});
	},
});

export const updateInternal = internalMutation({
	args: {
		externalId: v.string(),
		status: v.union(v.literal("accepted"), v.literal("revoked")),
	},
	handler: async (ctx, args) => {
		const invitation = await ctx.db
			.query("invitations")
			.withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
			.unique();
		if (!invitation) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}
		return await ctx.db.patch(invitation._id, {
			status: args.status,
			updatedAt: new Date().toISOString(),
		});
	},
});
