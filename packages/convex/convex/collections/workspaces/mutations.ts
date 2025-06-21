import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalMutation, mutation } from "../../_generated/server";
import { retrier } from "../../components/actionRetrier";
import { internalMutationWithTrigger } from "../../triggers";
import { ERRORS } from "../../utils/errors";
import { getCurrentUser } from "../users/utils";

export const createPersonalWorkspace = mutation({
	args: {
		title: v.string(),
	},
	handler: async (ctx, args) => {
		const { title } = args;

		const user = await getCurrentUser(ctx);

		const isPersonalSpaceAvailable = await ctx.runQuery(
			internal.collections.workspaces.queries.checkIsPersonalWorkspaceAvailable,
			{
				ownerId: user._id,
			},
		);

		if (!isPersonalSpaceAvailable) {
			throw new ConvexError(ERRORS.PERSONAL_WORKSPACE_LIMIT_REACHED);
		}

		// Create workspace
		const workspaceId = await ctx.db.insert("workspaces", {
			externalId: user.externalId,
			ownerId: user._id,
			workspaceType: "personal",
			title,
			isOnboarded: false,
			isSubscribed: false,
		});

		// Set user's current workspace
		await ctx.db.patch(user._id, { currentWorkspaceId: workspaceId });

		// Create Project
		const projectId = await ctx.db.insert("projects", {
			title: "Untitled Project",
			color: "indigo",
			icon: "rocket",
			workspaceId: workspaceId,
			createdBy: user._id,
			isOnboarded: false,
		});

		// Set user's current project
		await ctx.db.patch(user._id, { currentProjectId: projectId });

		// Create Onboarding
		await ctx.runMutation(internal.collections.onboarding.mutations.create, {
			workspaceId: workspaceId,
			projectId: projectId,
			createdBy: user._id,
			type: "workspace",
		});

		// Create Stripe customer
		await retrier.run(ctx, internal.lib.stripe.createStripeCustomer, {
			workspaceId: workspaceId,
			userId: user._id,
		});

		return workspaceId;
	},
});

export const deletePermanentInternal = internalMutationWithTrigger({
	args: {
		id: v.id("workspaces"),
	},
	handler: async (ctx, args) => {
		await ctx.db.delete(args.id);
	},
});

export const update = mutation({
	args: {
		id: v.id("workspaces"),
		title: v.optional(v.string()),
		logo: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);

		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Get workspace
		const workspace = await ctx.db.get(args.id);

		if (!workspace) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Check if user is the owner or has permission to update
		if (workspace.ownerId !== user._id) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const updateObject: Partial<typeof workspace> = {};

		if (args.title !== undefined) {
			updateObject.title = args.title;
		}

		if (args.logo !== undefined) {
			updateObject.logo = args.logo;
		}

		await ctx.db.patch(args.id, updateObject);
	},
});

export const updateCustomerId = internalMutation({
	args: {
		id: v.id("workspaces"),
		customerId: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.id, { customerId: args.customerId });
	},
});
