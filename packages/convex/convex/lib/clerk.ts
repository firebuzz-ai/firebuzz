import { createClerkClient } from "@clerk/backend";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalAction } from "../_generated/server";
import { ERRORS } from "../utils/errors";

const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkSecretKey) {
	throw new Error("CLERK_SECRET_KEY is not set");
}

export const clerkClient = createClerkClient({
	secretKey: clerkSecretKey,
});

// @actions
export const createOrganizationInternal = internalAction({
	args: {
		workspaceId: v.id("workspaces"),
		maxAllowedMemberships: v.number(),
		type: v.union(v.literal("personal"), v.literal("team")),
	},
	handler: async (ctx, args) => {
		try {
			// 1) Get the workspace
			const workspace = await ctx.runQuery(
				internal.collections.workspaces.queries.getByIdInternal,
				{
					id: args.workspaceId,
				},
			);

			if (!workspace) {
				throw new ConvexError(ERRORS.NOT_FOUND);
			}

			// 2) Get the Owner
			const owner = await ctx.runQuery(
				internal.collections.users.queries.getByIdInternal,
				{
					id: workspace.ownerId,
				},
			);

			if (!owner) {
				throw new ConvexError(ERRORS.NOT_FOUND);
			}

			// 3) Create the organization
			const organization = await clerkClient.organizations.createOrganization({
				name: workspace.title,
				slug: workspace.slug,
				maxAllowedMemberships: args.maxAllowedMemberships,
				createdBy: owner.externalId,
				privateMetadata: {
					workspaceId: workspace._id,
					ownerId: owner._id,
				},
			});

			// 4) Update the workspace with the organization ID
			await ctx.runMutation(
				internal.collections.workspaces.mutations.updateExternalId,
				{
					id: args.workspaceId,
					externalId: organization.id,
					type: args.type,
				},
			);

			// 5) Return the organization ID
			return organization.id;
		} catch (error) {
			if (error instanceof ConvexError) {
				throw error; // Re-throw the error if it's a ConvexError
			}
		}
	},
});

export const createOrganizationInvitation = action({
	args: {
		email: v.string(),
		role: v.union(v.literal("org:admin"), v.literal("org:member")),
	},
	handler: async (ctx, args) => {
		try {
			// 1) Get User
			const user = await ctx.runQuery(
				internal.collections.users.queries.getCurrentUserInternal,
			);

			if (
				!user ||
				!user.currentWorkspaceExternalId ||
				!user.externalId ||
				!user.currentWorkspaceId
			) {
				console.log("User not found", user);
				throw new ConvexError(ERRORS.NOT_FOUND);
			}

			// 2) Create Organization Invitation
			const invitation =
				await clerkClient.organizations.createOrganizationInvitation({
					organizationId: user.currentWorkspaceExternalId,
					emailAddress: args.email,
					inviterUserId: user.externalId,
					redirectUrl: `${process.env.PUBLIC_APP_URL}/accept-invitation?email=${args.email}`,
					role: args.role,
				});

			// 3) Create Invitation
			await ctx.runMutation(
				internal.collections.invitations.mutations.createInternal,
				{
					email: args.email,
					role: args.role,
					workspaceId: user.currentWorkspaceId,
					invitedBy: user._id,
					externalId: invitation.id,
					organizationExternalId: user.currentWorkspaceExternalId,
					status: invitation.status ?? "pending",
				},
			);

			return invitation.id;
		} catch (error) {
			if (error instanceof ConvexError) {
				throw error; // Re-throw the error if it's a ConvexError
			}

			console.log("Error creating organization invitation", error);
			throw new ConvexError(ERRORS.SOMETHING_WENT_WRONG);
		}
	},
});

export const revokeOrganizationInvitation = action({
	args: {
		invitationId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.runQuery(
			internal.collections.users.queries.getCurrentUserInternal,
		);

		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const invitation = await ctx.runQuery(
			internal.collections.invitations.queries.getByExternalIdInternal,
			{
				externalId: args.invitationId,
			},
		);

		if (!invitation || invitation.status !== "pending") {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (invitation.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		await clerkClient.organizations.revokeOrganizationInvitation({
			organizationId: invitation.organizationExternalId,
			invitationId: args.invitationId,
			requestingUserId: user.externalId,
		});
	},
});

export const resendOrganizationInvitation = action({
	args: {
		invitationId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.runQuery(
			internal.collections.users.queries.getCurrentUserInternal,
		);

		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const invitation = await ctx.runQuery(
			internal.collections.invitations.queries.getByExternalIdInternal,
			{
				externalId: args.invitationId,
			},
		);

		if (
			!invitation ||
			invitation.status === "accepted" ||
			invitation.status === "revoked"
		) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (invitation.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const newInvitation =
			await clerkClient.organizations.createOrganizationInvitation({
				organizationId: invitation.organizationExternalId,
				emailAddress: invitation.email,
				inviterUserId: user.externalId,
				role: invitation.role,
				redirectUrl: `${process.env.PUBLIC_APP_URL}/accept-invitation?email=${invitation.email}`,
			});

		await ctx.runMutation(
			internal.collections.invitations.mutations.createInternal,
			{
				email: invitation.email,
				role: invitation.role,
				workspaceId: invitation.workspaceId,
				invitedBy: invitation.invitedBy,
				externalId: newInvitation.id,
				organizationExternalId: invitation.organizationExternalId,
				status: newInvitation.status ?? "pending",
			},
		);
	},
});

export const updateOrganization = internalAction({
	args: {
		name: v.optional(v.string()),
		slug: v.optional(v.string()),
		organizationId: v.string(),
	},
	handler: async (_ctx, args) => {
		const updateObject: {
			name?: string;
			slug?: string;
		} = {};

		if (args.name) {
			updateObject.name = args.name;
		}

		if (args.slug) {
			updateObject.slug = args.slug;
		}

		await clerkClient.organizations.updateOrganization(
			args.organizationId,
			updateObject,
		);
	},
});
