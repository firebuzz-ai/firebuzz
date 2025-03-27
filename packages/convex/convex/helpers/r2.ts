import { R2 } from "@convex-dev/r2";
import { ConvexError, v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { getCurrentUser } from "../collections/users/utils";

export const r2 = new R2(components.r2);

export const { syncMetadata } = r2.clientApi({
	checkUpload: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new ConvexError("Unauthorized");
		}
	},
});

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		// Replace this with whatever function you use to get the current user
		const currentUser = await getCurrentUser(ctx);

		const key = `${currentUser._id}.${crypto.randomUUID()}`;
		return r2.generateUploadUrl(key);
	},
});

export const getImageUrl = query({
	args: {
		key: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new ConvexError("Unauthorized");
		}

		return r2.getUrl(args.key);
	},
});
