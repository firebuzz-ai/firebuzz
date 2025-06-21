import { v } from "convex/values";
import {
	internalMutationWithTrigger,
	mutationWithTrigger,
} from "../../../triggers";
import { getCurrentUserWithWorkspace } from "../../users/utils";

export const create = mutationWithTrigger({
	args: {
		name: v.string(),
		description: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId || !user.currentProjectId) {
			throw new Error("Unauthorized");
		}

		// Get Last Index
		const lastIndex = await ctx.db
			.query("knowledgeBases")
			.filter((q) => q.eq(q.field("projectId"), user.currentProjectId))
			.order("desc")
			.first();

		const index = lastIndex ? (lastIndex.index ?? 0) + 1 : 0;

		const knowledgeBase = await ctx.db.insert("knowledgeBases", {
			name: args.name,
			description: args.description,
			createdBy: user._id,
			workspaceId: user.currentWorkspaceId,
			projectId: user.currentProjectId,
			index,
			isSystem: false,
			isVisible: true,
		});

		return knowledgeBase;
	},
});

export const createInternal = internalMutationWithTrigger({
	args: {
		name: v.string(),
		description: v.string(),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		index: v.number(),
		isVisible: v.boolean(),
		isSystem: v.boolean(),
		createdBy: v.id("users"),
	},
	handler: async (ctx, args) => {
		const knowledgeBase = await ctx.db.insert("knowledgeBases", {
			name: args.name,
			description: args.description,
			createdBy: args.createdBy,
			workspaceId: args.workspaceId,
			projectId: args.projectId,
			index: args.index,
			isVisible: args.isVisible,
			isSystem: args.isSystem,
		});

		return knowledgeBase;
	},
});

export const update = mutationWithTrigger({
	args: {
		id: v.id("knowledgeBases"),
		name: v.string(),
		description: v.string(),
		index: v.optional(v.number()),
		isVisible: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentProjectId) {
			throw new Error("Unauthorized");
		}

		const updateObject: Record<string, string | number | undefined | boolean> =
			{
				name: args.name,
				description: args.description,
			};

		if (args.index !== undefined) {
			updateObject.index = args.index;
		}

		if (args.isVisible !== undefined) {
			updateObject.isVisible = args.isVisible;
		}

		const knowledgeBase = await ctx.db.patch(args.id, updateObject);

		return knowledgeBase;
	},
});

export const deletePermanent = mutationWithTrigger({
	args: {
		id: v.id("knowledgeBases"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentProjectId) {
			throw new Error("Unauthorized");
		}

		await ctx.db.delete(args.id);
	},
});

export const deletePermananentInternal = internalMutationWithTrigger({
	args: {
		id: v.id("knowledgeBases"),
	},
	handler: async (ctx, args) => {
		await ctx.db.delete(args.id);
	},
});
