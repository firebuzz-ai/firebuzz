import { ConvexError, v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { internal } from "../../_generated/api";
import { internalMutation, mutation } from "../../_generated/server";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";

export const createInternal = internalMutation({
	args: {
		externalId: v.string(),
		role: v.union(v.literal("org:admin"), v.literal("org:member")),
		organizationExternalId: v.string(),
		userExternalId: v.string(),
	},
	handler: async (ctx, args) => {
		// 1) Check if Member already exists
		const existingMember = await ctx.db
			.query("members")
			.withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
			.unique();

		if (existingMember) {
			console.log("Member already exists", existingMember);
			return;
		}

		// 2) Get Workspace by External ID
		const workspace = await ctx.db
			.query("workspaces")
			.withIndex("by_external_id", (q) =>
				q.eq("externalId", args.organizationExternalId),
			)
			.unique();

		if (!workspace) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// 3) Get User by External ID
		const user = await ctx.db
			.query("users")
			.withIndex("by_external_id", (q) =>
				q.eq("externalId", args.userExternalId),
			)
			.unique();

		if (!user) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// 4) Create Member
		return await ctx.db.insert("members", {
			externalId: args.externalId,
			role: args.role,
			workspaceId: workspace._id,
			userId: user._id,
			organizationExternalId: args.organizationExternalId,
			userExternalId: args.userExternalId,
			updatedAt: new Date().toISOString(),
		});
	},
});

export const updateInternal = internalMutation({
	args: {
		externalId: v.string(),
		role: v.union(v.literal("org:admin"), v.literal("org:member")),
	},
	handler: async (ctx, args) => {
		const member = await ctx.db
			.query("members")
			.withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
			.unique();
		if (!member) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}
		return await ctx.db.patch(member._id, {
			role: args.role,
			updatedAt: new Date().toISOString(),
		});
	},
});

export const deleteInternalByExternalId = internalMutation({
	args: {
		externalId: v.string(),
	},
	handler: async (ctx, args) => {
		const member = await ctx.db
			.query("members")
			.withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
			.unique();

		if (!member) {
			console.log("Member not found", args.externalId);
			return;
		}

		return await ctx.db.delete(member._id);
	},
});

export const deleteInternalByUserId = internalMutation({
	args: {
		userId: v.id("users"),
	},
	handler: async (ctx, args) => {
		const members = await ctx.db
			.query("members")
			.withIndex("by_user_id", (q) => q.eq("userId", args.userId))
			.collect();

		await asyncMap(members, async (member) => {
			await ctx.scheduler.runAfter(
				0,
				internal.lib.clerk.removeClerkMemberInternal,
				{
					userExternalId: member.userExternalId,
					organizationExternalId: member.organizationExternalId,
				},
			);
		});
	},
});

export const updateRoleInternal = internalMutation({
	args: {
		userId: v.id("users"),
		workspaceId: v.id("workspaces"),
		role: v.union(v.literal("org:admin"), v.literal("org:member")),
	},
	handler: async (ctx, args) => {
		const member = await ctx.db
			.query("members")
			.withIndex("by_user_id_workspace_id", (q) =>
				q.eq("userId", args.userId).eq("workspaceId", args.workspaceId),
			)
			.unique();

		if (!member) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		return await ctx.db.patch(member._id, {
			role: args.role,
			updatedAt: new Date().toISOString(),
		});
	},
});

export const removeFromWorkspaceInternal = internalMutation({
	args: {
		userId: v.id("users"),
		workspaceId: v.id("workspaces"),
	},
	handler: async (ctx, args) => {
		const member = await ctx.db
			.query("members")
			.withIndex("by_user_id_workspace_id", (q) =>
				q.eq("userId", args.userId).eq("workspaceId", args.workspaceId),
			)
			.unique();

		if (!member) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Remove member from Clerk organization
		await ctx.scheduler.runAfter(
			0,
			internal.lib.clerk.removeClerkMemberInternal,
			{
				userExternalId: member.userExternalId,
				organizationExternalId: member.organizationExternalId,
			},
		);

		return await ctx.db.delete(member._id);
	},
});

export const handleChangeRole = mutation({
	args: {
		userExternalId: v.string(),
		newRole: v.union(v.literal("org:admin"), v.literal("org:member")),
	},
	handler: async (ctx, args) => {
		const currentUser = await getCurrentUserWithWorkspace(ctx);

		if (
			!currentUser ||
			!currentUser.currentWorkspaceExternalId ||
			!currentUser.currentWorkspaceId
		) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Get current workspace
		const workspace = await ctx.db.get(currentUser.currentWorkspaceId);

		if (!workspace) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Get the target user
		const targetUser = await ctx.db
			.query("users")
			.withIndex("by_external_id", (q) =>
				q.eq("externalId", args.userExternalId),
			)
			.unique();

		if (!targetUser) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		const targetMember = await ctx.db
			.query("members")
			.withIndex("by_user_id_workspace_id", (q) =>
				q.eq("userId", targetUser._id).eq("workspaceId", workspace._id),
			)
			.unique();

		if (!targetMember) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Authorization checks
		const isCurrentUserOwner = workspace.ownerId === currentUser._id;
		const isCurrentUserAdmin = currentUser.currentRole === "org:admin";
		const isTargetUserOwner = workspace.ownerId === targetUser._id;
		const isTargetUserAdmin = targetMember.role === "org:admin";
		const isSameUser = currentUser._id === targetUser._id;

		// Can't change own role
		if (isSameUser) {
			throw new ConvexError("Cannot change your own role");
		}

		// Can't change owner's role
		if (isTargetUserOwner) {
			throw new ConvexError("Cannot change owner's role");
		}

		// Only admins can change roles
		if (!isCurrentUserAdmin && !isCurrentUserOwner) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Only owner can change admin roles
		if (isTargetUserAdmin && !isCurrentUserOwner) {
			throw new ConvexError("Only the owner can change admin roles");
		}

		// Update role in Clerk (Webhook will handle updating Convex)
		await ctx.scheduler.runAfter(
			0,
			internal.lib.clerk.updateClerkMemberInternal,
			{
				userExternalId: args.userExternalId,
				organizationExternalId: currentUser.currentWorkspaceExternalId,
				role: args.newRole,
			},
		);

		return { success: true };
	},
});

export const handleRemoveMember = mutation({
	args: {
		userExternalId: v.string(),
	},
	handler: async (ctx, args) => {
		const currentUser = await getCurrentUserWithWorkspace(ctx);

		if (
			!currentUser ||
			!currentUser.currentWorkspaceExternalId ||
			!currentUser.currentWorkspaceId
		) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const workspace = await ctx.db.get(currentUser.currentWorkspaceId);

		if (!workspace) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		const targetUser = await ctx.db
			.query("users")
			.withIndex("by_external_id", (q) =>
				q.eq("externalId", args.userExternalId),
			)
			.unique();

		if (!targetUser) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		const targetMember = await ctx.db
			.query("members")
			.withIndex("by_user_id_workspace_id", (q) =>
				q.eq("userId", targetUser._id).eq("workspaceId", workspace._id),
			)
			.unique();

		if (!targetMember) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		const isCurrentUserOwner = workspace.ownerId === currentUser._id;
		const isCurrentUserAdmin = currentUser.currentRole === "org:admin";
		const isTargetUserOwner = workspace.ownerId === targetUser._id;
		const isTargetUserAdmin = targetMember.role === "org:admin";
		const isSameUser = currentUser._id === targetUser._id;

		// Can't remove yourself
		if (isSameUser) {
			throw new ConvexError("Cannot remove yourself from the workspace");
		}

		// Can't remove owner
		if (isTargetUserOwner) {
			throw new ConvexError("Cannot remove the workspace owner");
		}

		// Only admins can remove members
		if (!isCurrentUserAdmin && !isCurrentUserOwner) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Only owner can remove admins
		if (isTargetUserAdmin && !isCurrentUserOwner) {
			throw new ConvexError("Only the owner can remove admin members");
		}
		// Remove member from Clerk organization (Webhook will handle deleting Convex)
		await ctx.scheduler.runAfter(
			0,
			internal.lib.clerk.removeClerkMemberInternal,
			{
				userExternalId: args.userExternalId,
				organizationExternalId: currentUser.currentWorkspaceExternalId,
			},
		);

		await ctx.scheduler.runAfter(
			0,
			internal.lib.clerk.revokeAllSessionsForUser,
			{
				userExternalId: args.userExternalId,
			},
		);

		// If user removed from current workspace, delete current workspace and project
		if (targetUser.currentWorkspaceId === workspace._id) {
			await ctx.db.patch(targetUser._id, {
				currentWorkspaceId: undefined,
				currentProjectId: undefined,
			});
		}

		return { success: true };
	},
});
