import { ConvexError, v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, mutation } from "../../_generated/server";
import {
	internalMutationWithTrigger,
	mutationWithTrigger,
} from "../../triggers";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";
import { projectSchema } from "./schema";
import { checkIfSlugIsAvailable } from "./utils";

export const create = mutation({
	args: {
		title: projectSchema.validator.fields.title,
		slug: projectSchema.validator.fields.slug,
		color: projectSchema.validator.fields.color,
		icon: projectSchema.validator.fields.icon,
	},
	handler: async (ctx, { title, color, icon, slug }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new ConvexError("User or current workspace not found.");
		}

		const isSlugAvailable = await checkIfSlugIsAvailable(
			ctx,
			slug,
			user.currentWorkspaceId,
		);

		if (!isSlugAvailable) {
			throw new ConvexError("Slug is already taken.");
		}

		// Create the project
		const newProjectId = await ctx.db.insert("projects", {
			title,
			color,
			slug,
			icon,
			workspaceId: user.currentWorkspaceId,
			createdBy: user._id,
			isOnboarded: false,
		});

		// Create onboarding
		await ctx.db.insert("onboarding", {
			projectId: newProjectId,
			workspaceId: user.currentWorkspaceId,
			createdBy: user._id,
			type: "project",
			isCompleted: false,
			step: 1,
			animationStep: 2,
			isProcessing: false,
			isTrialActive: false,
		});

		// Change user's current project
		await ctx.db.patch(user._id, {
			currentProjectId: newProjectId,
		});
	},
});

export const update = mutation({
	args: {
		projectId: v.id("projects"),
		name: v.optional(v.string()),
		slug: v.optional(v.string()),
		color: v.optional(v.string()),
		icon: v.optional(v.string()),
	},
	handler: async (ctx, { projectId, name, color, icon, slug }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		if (!user || !user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Get Project
		const project = await ctx.db.get(projectId);

		if (!project) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (project.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const updateObject: Partial<Doc<"projects">> = {};

		if (name) {
			updateObject.title = name;
		}

		if (color) {
			updateObject.color = color;
		}

		if (icon) {
			updateObject.icon = icon;
		}

		if (slug) {
			const isSlugAvailable = await checkIfSlugIsAvailable(
				ctx,
				slug,
				user.currentWorkspaceId,
				projectId,
			);

			if (!isSlugAvailable) {
				throw new ConvexError("Slug is already taken.");
			}

			updateObject.slug = slug;
		}

		await ctx.db.patch(projectId, updateObject);
	},
});

export const updateInternal = internalMutation({
	args: {
		projectId: v.id("projects"),
		name: v.optional(v.string()),
		slug: v.optional(v.string()),
		color: v.optional(v.string()),
		icon: v.optional(v.string()),
		isOnboarded: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const updateObject: Partial<Doc<"projects">> = {};

		if (args.name) {
			updateObject.title = args.name;
		}

		if (args.color) {
			updateObject.color = args.color;
		}

		if (args.icon) {
			updateObject.icon = args.icon;
		}

		if (args.isOnboarded) {
			updateObject.isOnboarded = args.isOnboarded;
		}

		if (args.slug) {
			const project = await ctx.db.get(args.projectId);
			if (!project) {
				throw new ConvexError(ERRORS.NOT_FOUND);
			}

			const isSlugAvailable = await checkIfSlugIsAvailable(
				ctx,
				args.slug,
				project.workspaceId,
				args.projectId,
			);

			if (!isSlugAvailable) {
				throw new ConvexError("Slug is already taken.");
			}

			updateObject.slug = args.slug;
		}

		await ctx.db.patch(args.projectId, updateObject);
	},
});

export const deletePermanent = mutationWithTrigger({
	args: {
		id: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user || !user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const project = await ctx.db.get(args.id);
		if (!project) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (project.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}
		await ctx.db.delete(args.id);
	},
});

export const deletePermanentInternal = internalMutationWithTrigger({
	args: {
		id: v.id("projects"),
	},
	handler: async (ctx, args) => {
		await ctx.db.delete(args.id);
	},
});
