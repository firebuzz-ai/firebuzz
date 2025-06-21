import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import {
	internalMutationWithTrigger,
	mutationWithTrigger,
} from "../../../triggers";
import { getCurrentUserWithWorkspace } from "../../users/utils";
import { mediaSchema } from "./schema";

export const create = mutationWithTrigger({
	args: {
		key: v.string(),
		name: v.string(),
		contentType: v.string(),
		size: v.number(),
		type: mediaSchema.fields.type,
		source: mediaSchema.fields.source,
		aiMetadata: mediaSchema.fields.aiMetadata,
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const projectId = user.currentProjectId;
		const workspaceId = user.currentWorkspaceId;

		if (!projectId || !workspaceId) {
			throw new Error("You are not allowed to create a media");
		}

		const mediaId = await ctx.db.insert("media", {
			...args,
			workspaceId,
			projectId,
			createdBy: user._id,
		});

		return mediaId;
	},
});

export const createInternal = internalMutationWithTrigger({
	args: {
		key: v.string(),
		name: v.string(),
		contentType: v.string(),
		size: v.number(),
		type: mediaSchema.fields.type,
		source: mediaSchema.fields.source,
		aiMetadata: mediaSchema.fields.aiMetadata,
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		createdBy: v.id("users"),
	},
	handler: async (ctx, args) => {
		const mediaId = await ctx.db.insert("media", {
			...args,
			workspaceId: args.workspaceId,
			projectId: args.projectId,
			createdBy: args.createdBy,
		});

		return mediaId;
	},
});

export const updateInternal = internalMutationWithTrigger({
	args: {
		id: v.id("media"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Check media is owned by user
		const media = await ctx.db.get(args.id);

		await ctx.db.patch(args.id, {
			name: args.name ?? media?.name,
			description: args.description ?? media?.description,
		});
	},
});

export const deleteInternal = internalMutationWithTrigger({
	args: {
		id: v.id("media"),
	},
	handler: async (ctx, { id }) => {
		await ctx.db.delete(id);
	},
});

export const deleteTemporary = mutationWithTrigger({
	args: {
		id: v.id("media"),
	},
	handler: async (ctx, { id }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new Error("You are not allowed to delete this image");
		}

		// Check media is owned by user
		const media = await ctx.db.get(id);
		if (media?.workspaceId !== user?.currentWorkspaceId) {
			throw new Error("You are not allowed to delete this image");
		}

		await ctx.db.patch(id, {
			deletedAt: new Date().toISOString(),
		});
	},
});

export const deletePermanent = internalMutationWithTrigger({
	args: {
		id: v.id("media"),
	},
	handler: async (ctx, { id }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new Error("You are not allowed to delete this image");
		}

		await ctx.db.delete(id);
	},
});

export const archive = mutationWithTrigger({
	args: {
		id: v.id("media"),
	},
	handler: async (ctx, { id }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new Error("You are not allowed to archive this image");
		}

		await ctx.db.patch(id, { isArchived: true });
	},
});

export const restore = mutationWithTrigger({
	args: {
		id: v.id("media"),
	},
	handler: async (ctx, { id }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new Error("You are not allowed to restore this image");
		}

		await ctx.db.patch(id, { isArchived: false });
	},
});

export const archiveMultiple = mutationWithTrigger({
	args: {
		ids: v.array(v.id("media")),
	},
	handler: async (ctx, { ids }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new Error("You are not allowed to archive multiple images");
		}

		await asyncMap(ids, async (id) => {
			await ctx.db.patch(id, { isArchived: true });
		});
	},
});

export const restoreMultiple = mutationWithTrigger({
	args: {
		ids: v.array(v.id("media")),
	},
	handler: async (ctx, { ids }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new Error("You are not allowed to restore multiple images");
		}

		await asyncMap(ids, async (id) => {
			await ctx.db.patch(id, { isArchived: false });
		});
	},
});

export const deleteTemporaryMultiple = mutationWithTrigger({
	args: {
		ids: v.array(v.id("media")),
	},
	handler: async (ctx, { ids }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new Error("You are not allowed to delete multiple images");
		}

		await asyncMap(ids, async (id) => {
			await ctx.db.patch(id, { deletedAt: new Date().toISOString() });
		});
	},
});
