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

export const deleteUserInternal = internalAction({
	args: {
		userExternalId: v.string(),
	},
	handler: async (_ctx, args) => {
		try {
			// 1) Revoke all sessions
			const sessionsResponse = await clerkClient.sessions.getSessionList({
				userId: args.userExternalId,
			});

			await Promise.all(
				sessionsResponse.data?.map(async (session) => {
					if (session.status === "active") {
						await clerkClient.sessions.revokeSession(session.id);
					}
				}),
			);

			// 2) Delete the user
			await clerkClient.users.deleteUser(args.userExternalId);
		} catch (error) {
			console.log("Error deleting user", error);
			throw new ConvexError(ERRORS.SOMETHING_WENT_WRONG);
		}
	},
});

export const updateOrganizationInternal = internalAction({
	args: {
		name: v.optional(v.string()),
		organizationId: v.string(),
		maxAllowedMemberships: v.optional(v.number()),
	},
	handler: async (_ctx, args) => {
		const updateObject: {
			name?: string;
			slug?: string;
			maxAllowedMemberships?: number;
		} = {};

		if (args.name) {
			updateObject.name = args.name;
		}

		if (args.maxAllowedMemberships) {
			updateObject.maxAllowedMemberships = args.maxAllowedMemberships;
		}

		await clerkClient.organizations.updateOrganization(
			args.organizationId,
			updateObject,
		);
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

			// Check if it's a Clerk error and extract the message
			if (
				error &&
				typeof error === "object" &&
				"clerkError" in error &&
				error.clerkError
			) {
				const clerkError = error as {
					errors?: Array<{ longMessage?: string; message?: string }>;
				};
				if (clerkError.errors && clerkError.errors.length > 0) {
					const errorMessage =
						clerkError.errors[0].longMessage ||
						clerkError.errors[0].message ||
						"Unknown error";
					throw new ConvexError(errorMessage);
				}
			}

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

export const getSessionsWithActivities = action({
	args: {},
	handler: async (ctx) => {
		try {
			// Get current user
			const user = await ctx.runQuery(
				internal.collections.users.queries.getCurrentUserInternal,
			);

			if (!user || !user.externalId) {
				throw new ConvexError(ERRORS.UNAUTHORIZED);
			}

			// Fetch sessions with activities from Clerk Backend API
			const sessionsResponse = await clerkClient.sessions.getSessionList({
				userId: user.externalId,
			});

			// Transform the sessions data to be Convex-compatible
			const transformedSessions =
				sessionsResponse.data?.map((session) => ({
					id: session.id,
					status: session.status,
					expireAt: new Date(session.expireAt).toISOString(),
					abandonAt: new Date(session.abandonAt).toISOString(),
					lastActiveAt: new Date(session.lastActiveAt).toISOString(),
					latestActivity: session.latestActivity
						? {
								id: session.latestActivity.id,
								browserName: session.latestActivity.browserName || null,
								browserVersion: session.latestActivity.browserVersion || null,
								deviceType: session.latestActivity.deviceType || null,
								ipAddress: session.latestActivity.ipAddress || null,
								city: session.latestActivity.city || null,
								country: session.latestActivity.country || null,
								isMobile: session.latestActivity.isMobile || false,
							}
						: null,
					actor: session.actor
						? {
								iss: String(session.actor.iss || ""),
								sid: String(session.actor.sid || ""),
								sub: String(session.actor.sub || ""),
							}
						: null,
				})) || [];

			return transformedSessions;
		} catch (error) {
			console.log("Error fetching sessions with activities", error);
			throw new ConvexError(ERRORS.SOMETHING_WENT_WRONG);
		}
	},
});

export const revokeSession = action({
	args: {
		sessionId: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			// Get current user
			const user = await ctx.runQuery(
				internal.collections.users.queries.getCurrentUserInternal,
			);

			if (!user || !user.externalId) {
				throw new ConvexError(ERRORS.UNAUTHORIZED);
			}

			// Revoke the session using Clerk Backend API
			await clerkClient.sessions.revokeSession(args.sessionId);

			return { success: true };
		} catch (error) {
			console.log("Error revoking session", error);
			throw new ConvexError(ERRORS.SOMETHING_WENT_WRONG);
		}
	},
});

export const revokeAllSessionsForUser = internalAction({
	args: {
		userExternalId: v.string(),
	},
	handler: async (_ctx, args) => {
		try {
			const sessionsResponse = await clerkClient.sessions.getSessionList({
				userId: args.userExternalId,
			});

			await Promise.all(
				sessionsResponse.data?.map(async (session) => {
					if (session.status === "active") {
						await clerkClient.sessions.revokeSession(session.id);
					}
				}),
			);
		} catch (error) {
			console.log("Error revoking all sessions for user", error);
			throw new ConvexError(ERRORS.SOMETHING_WENT_WRONG);
		}
	},
});

export const updateClerkMemberInternal = internalAction({
	args: {
		userExternalId: v.string(),
		organizationExternalId: v.string(),
		role: v.union(v.literal("org:admin"), v.literal("org:member")),
	},
	handler: async (_ctx, args) => {
		try {
			await clerkClient.organizations.updateOrganizationMembership({
				organizationId: args.organizationExternalId,
				userId: args.userExternalId,
				role: args.role,
			});
		} catch (error) {
			console.log("Error updating clerk member", error);
			throw new ConvexError(ERRORS.SOMETHING_WENT_WRONG);
		}
	},
});

export const removeClerkMemberInternal = internalAction({
	args: {
		userExternalId: v.string(),
		organizationExternalId: v.string(),
	},
	handler: async (_ctx, args) => {
		try {
			await clerkClient.organizations.deleteOrganizationMembership({
				organizationId: args.organizationExternalId,
				userId: args.userExternalId,
			});
		} catch (error) {
			console.log("Error removing clerk member", error);
			throw new ConvexError(ERRORS.SOMETHING_WENT_WRONG);
		}
	},
});
