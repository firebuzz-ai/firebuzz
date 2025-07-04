import type { UserIdentity } from "convex/server";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export const getTeamWorkspaceByExternalId = async (
	ctx: QueryCtx | MutationCtx,
	externalId: string,
) => {
	const workspace = await ctx.db
		.query("workspaces")
		.withIndex("by_external_id", (q) => q.eq("externalId", externalId))
		.unique();
	return workspace;
};

export const getPersonalWorkspacesByExternalId = async (
	ctx: QueryCtx | MutationCtx,
	externalId: string,
) => {
	const workspace = await ctx.db
		.query("workspaces")
		.withIndex("by_external_id", (q) => q.eq("externalId", externalId))
		.collect();

	return workspace;
};

export const getPersonalWorkspacesByOwnerId = async (
	ctx: QueryCtx | MutationCtx,
	ownerId: Id<"users">,
) => {
	const workspaces = await ctx.db
		.query("workspaces")
		.withIndex("by_owner_id", (q) => q.eq("ownerId", ownerId))
		.collect();
	return workspaces;
};

export const getCurrentWorkspace = async (
	ctx: QueryCtx | MutationCtx,
	user: Doc<"users">,
	clerkUser: UserIdentity,
) => {
	// If the user has a current workspace, return it.
	if (user.currentWorkspaceId) {
		return await ctx.db.get(user.currentWorkspaceId);
	}

	// If the user is a member of a team, return the team workspace.
	if (clerkUser.org_id) {
		return await getTeamWorkspaceByExternalId(ctx, clerkUser.org_id as string); // clerkUser.org_id is the team's ID
	}

	// If the user has a personal workspace, return it.
	const personalWorkspaces = await getPersonalWorkspacesByExternalId(
		ctx,
		user.externalId,
	);

	if (personalWorkspaces.length > 0) {
		return personalWorkspaces[0];
	}

	return null;
};

export const checkIfSlugIsAvailable = async (
	ctx: QueryCtx | MutationCtx,
	slug: string,
	workspaceId?: Id<"workspaces">,
) => {
	const workspace = await ctx.db
		.query("workspaces")
		.withIndex("by_slug", (q) => q.eq("slug", slug))
		.filter((q) => (workspaceId ? q.neq(q.field("_id"), workspaceId) : true))
		.unique();

	return !workspace;
};
