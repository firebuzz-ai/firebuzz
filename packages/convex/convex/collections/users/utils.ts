import { ConvexError } from "convex/values";
import type { QueryCtx } from "../../_generated/server";
import { ERRORS } from "../../utils/errors";
import { getCurrentWorkspace } from "../workspaces/utils";

export const getUserByExternalId = async (
	ctx: QueryCtx,
	externalId: string,
) => {
	return await ctx.db
		.query("users")
		.withIndex("by_external_id", (q) => q.eq("externalId", externalId))
		.unique();
};

export const getCurrentUser = async (ctx: QueryCtx) => {
	const clerkUser = await ctx.auth.getUserIdentity();

	if (!clerkUser) {
		throw new ConvexError(ERRORS.UNAUTHORIZED);
	}

	const user = await getUserByExternalId(ctx, clerkUser.subject); // clerkUser.subject is the user's ID

	if (!user) {
		throw new ConvexError(ERRORS.UNAUTHORIZED);
	}

	const currentWorkspace = await getCurrentWorkspace(ctx, user, clerkUser);

	const userWithCurrentWorkspace = {
		...user,
		currentWorkspaceId: currentWorkspace?._id,
		currentWorkspaceExternalId: currentWorkspace?.externalId,
		currentRole: (clerkUser.org_role
			? clerkUser.org_role.toString()
			: currentWorkspace?.ownerId === user._id
				? "org:admin"
				: "org:member") as "org:admin" | "org:member",
	};

	return userWithCurrentWorkspace;
};

export const getCurrentUserWithWorkspace = async (ctx: QueryCtx) => {
	const clerkUser = await ctx.auth.getUserIdentity();

	if (!clerkUser) {
		throw new ConvexError(ERRORS.UNAUTHORIZED);
	}

	const user = await getUserByExternalId(ctx, clerkUser.subject); // clerkUser.subject is the user's ID

	if (!user) {
		throw new ConvexError(ERRORS.UNAUTHORIZED);
	}

	const currentWorkspace = await getCurrentWorkspace(ctx, user, clerkUser);

	if (!currentWorkspace) {
		throw new ConvexError(ERRORS.UNAUTHORIZED);
	}

	const userWithCurrentWorkspace = {
		...user,
		currentWorkspaceId: currentWorkspace?._id,
		currentWorkspaceExternalId: currentWorkspace?.externalId,
		currentRole: (clerkUser.org_role
			? clerkUser.org_role.toString()
			: "org:admin") as "org:admin" | "org:member",
	};

	return userWithCurrentWorkspace;
};
