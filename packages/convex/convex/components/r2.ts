import { R2 } from "@convex-dev/r2";
import { ConvexError, v } from "convex/values";
import { components, internal } from "../_generated/api";
import {
	internalAction,
	internalMutation,
	mutation,
	query,
} from "../_generated/server";
import { getCurrentUserWithWorkspace } from "../collections/users/utils";

export const r2 = new R2(components.r2);

export const { syncMetadata } = r2.clientApi();

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const key = `${user.currentWorkspaceId}/${user.currentProjectId}/${crypto.randomUUID()}`;
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

export const deletePermanent = internalMutation({
	args: {
		key: v.string(),
	},
	handler: async (ctx, args) => {
		return r2.deleteObject(ctx, args.key);
	},
});

export const uploadFromURL = internalAction({
	args: {
		url: v.string(),
		projectId: v.id("projects"),
		workspaceId: v.id("workspaces"),
	},
	handler: async (ctx, args) => {
		const image = await fetch(args.url);
		const imageBuffer = await image.arrayBuffer();
		const imageData = new Uint8Array(imageBuffer);
		const key = `${args.workspaceId}/${args.projectId}/${crypto.randomUUID()}`;

		await r2.store(ctx, imageData, {
			key,
			type: image.headers.get("content-type") || "image/png",
		});

		return key;
	},
});

export const uploadUserAvatarFromURL = internalAction({
	args: {
		url: v.string(),
		userExternalId: v.string(),
	},
	handler: async (ctx, args) => {
		const image = await fetch(args.url);
		const imageBuffer = await image.arrayBuffer();
		const imageData = new Uint8Array(imageBuffer);
		const key = `users/${args.userExternalId}/avatar-${crypto.randomUUID()}`;

		await r2.store(ctx, imageData, {
			key,
			type: image.headers.get("content-type") || "image/png",
		});

		await ctx.runMutation(
			internal.collections.users.mutations.updateAvatarInternal,
			{
				imageKey: key,
				userExternalId: args.userExternalId,
			},
		);
	},
});
