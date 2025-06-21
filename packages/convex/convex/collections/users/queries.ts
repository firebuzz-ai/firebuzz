import { v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { getCurrentUser, getUserByExternalId } from "./utils";

export const getCurrent = query({
	args: {},
	handler: async (ctx) => {
		return await getCurrentUser(ctx);
	},
});

export const getCurrentUserInternal = internalQuery({
	handler: async (ctx) => {
		return await getCurrentUser(ctx);
	},
});

export const getByIdInternal = internalQuery({
	args: { id: v.id("users") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const getByExternalIdInternal = internalQuery({
	args: { externalId: v.string() },
	handler: async (ctx, args) => {
		return await getUserByExternalId(ctx, args.externalId);
	},
});
