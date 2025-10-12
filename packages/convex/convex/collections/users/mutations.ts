import type { UserJSON } from "@clerk/backend";
import { ConvexError, type Validator, v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { internal } from "../../_generated/api";
import { internalMutation, mutation } from "../../_generated/server";
import { internalMutationWithTrigger } from "../../triggers";
import { ERRORS } from "../../utils/errors";
import { getWorkspaceByExternalId } from "../workspaces/utils";
import {
	getCurrentUser,
	getCurrentUserWithWorkspace,
	getUserByExternalId,
} from "./utils";

export const upsertFromClerk = internalMutation({
	args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
	async handler(ctx, { data }) {
		const userAttributes = {
			firstName: data.first_name ?? undefined,
			lastName: data.last_name ?? undefined,
			fullName: `${data.first_name} ${data.last_name}`,
			email: data.email_addresses[0].email_address,
			externalId: data.id,
		};

		// Check if the user already exists
		const user = await getUserByExternalId(ctx, data.id);
		if (user === null) {
			// If the user does not exist, create a new user
			await ctx.db.insert("users", userAttributes);

			// Upload the avatar to R2
			if (data.image_url) {
				await ctx.scheduler.runAfter(
					0,
					internal.components.r2.uploadUserAvatarFromURL,
					{
						url: data.image_url,
						userExternalId: data.id,
					},
				);
			}
		} else {
			// If the user exists, update the user
			await ctx.db.patch(user._id, userAttributes);
			await ctx.scheduler.runAfter(
				0,
				internal.components.r2.uploadUserAvatarFromURL,
				{
					url: data.image_url,
					userExternalId: data.id,
				},
			);
		}
	},
});

export const deleteUserFromClerk = mutation({
	handler: async (ctx) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Check if user owns any workspaces
		const ownedWorkspaces = await ctx.db
			.query("workspaces")
			.withIndex("by_owner_id", (q) => q.eq("ownerId", user._id))
			.collect();

		if (ownedWorkspaces.length > 0) {
			let hasActiveSubscriptions = false;
			// Check active subscriptions
			await asyncMap(ownedWorkspaces, async (workspace) => {
				const subscriptions = await ctx.db
					.query("subscriptions")
					.withIndex("by_workspace_id", (q) =>
						q.eq("workspaceId", workspace._id),
					)
					.filter((q) =>
						q.and(
							q.or(
								q.eq(q.field("status"), "active"),
								q.eq(q.field("status"), "trialing"),
								q.eq(q.field("status"), "incomplete"),
								q.eq(q.field("status"), "incomplete_expired"),
								q.eq(q.field("status"), "past_due"),
								q.eq(q.field("status"), "unpaid"),
							),
							q.eq(q.field("cancelAtPeriodEnd"), false),
						),
					)
					.collect();

				hasActiveSubscriptions = subscriptions.length > 0;
			});

			if (hasActiveSubscriptions) {
				throw new ConvexError(
					"You cannot delete your account because you have active subscriptions.",
				);
			}
		}

		// Delete user from Clerk (Webhook will handle deleting Convex)
		await ctx.scheduler.runAfter(0, internal.lib.clerk.deleteUserInternal, {
			userExternalId: user.externalId,
		});
	},
});

export const deleteUserWithAllDataByExternalId = internalMutationWithTrigger({
	args: { externalId: v.string() },
	handler: async (ctx, { externalId }) => {
		const user = await getUserByExternalId(ctx, externalId);
		if (user) {
			await ctx.db.delete(user._id);
		}
	},
});

export const updateCurrentProject = mutation({
	args: {
		currentProjectId: v.optional(v.id("projects")),
	},
	handler: async (ctx, { currentProjectId }) => {
		const user = await getCurrentUser(ctx);
		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Get the project
		if (currentProjectId) {
			const project = await ctx.db.get(currentProjectId);
			if (!project) {
				throw new ConvexError(ERRORS.NOT_FOUND);
			}

			await ctx.db.patch(user._id, {
				currentProjectId,
				currentWorkspaceId: project.workspaceId,
			});
			return;
		}

		// Clear the current project
		await ctx.db.patch(user._id, { currentProjectId: undefined });
	},
});

export const updateCurrentWorkspace = mutation({
	args: {
		currentWorkspaceId: v.optional(v.id("workspaces")),
	},
	handler: async (ctx, { currentWorkspaceId }) => {
		const user = await getCurrentUser(ctx);
		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}
		await ctx.db.patch(user._id, { currentWorkspaceId });
	},
});

export const updateCurrentWorkspaceByExternalId = mutation({
	args: {
		currentWorkspaceExternalId: v.string(),
	},
	handler: async (ctx, { currentWorkspaceExternalId }) => {
		const user = await getCurrentUser(ctx);
		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}
		const workspace = await getWorkspaceByExternalId(
			ctx,
			currentWorkspaceExternalId,
		);
		if (!workspace) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}
		await ctx.db.patch(user._id, { currentWorkspaceId: workspace._id });
	},
});

export const updateProfile = mutation({
	args: {
		firstName: v.optional(v.string()),
		lastName: v.optional(v.string()),
		imageKey: v.optional(v.string()),
	},
	handler: async (ctx, { firstName, lastName, imageKey }) => {
		const user = await getCurrentUser(ctx);
		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Build fullName from firstName and lastName
		let fullName: string | undefined;
		if (firstName || lastName) {
			fullName = `${firstName || ""} ${lastName || ""}`.trim();
		}

		await ctx.db.patch(user._id, {
			firstName,
			lastName,
			fullName,
			imageKey,
		});
	},
});

export const updateAvatarInternal = internalMutation({
	args: {
		imageKey: v.string(),
		userExternalId: v.string(),
	},
	handler: async (ctx, { imageKey, userExternalId }) => {
		// Get the user
		const user = await getUserByExternalId(ctx, userExternalId);
		if (!user) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Update the user
		await ctx.db.patch(user._id, {
			imageKey,
		});
	},
});
