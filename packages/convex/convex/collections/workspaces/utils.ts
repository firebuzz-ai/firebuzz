import { asyncMap } from "convex-helpers";
import type { UserIdentity } from "convex/server";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export const getWorkspaceByExternalId = async (
	ctx: QueryCtx | MutationCtx,
	externalId: string,
) => {
	const workspace = await ctx.db
		.query("workspaces")
		.withIndex("by_external_id", (q) => q.eq("externalId", externalId))
		.first();
	return workspace;
};

export const getWorkspacesByExternalIds = async (
	ctx: QueryCtx | MutationCtx,
	externalIds: string[],
) => {
	const workspaces = await asyncMap(externalIds, async (externalId) => {
		return await getWorkspaceByExternalId(ctx, externalId);
	});
	return workspaces.filter((workspace) => workspace !== null);
};

export const getWorkspacesByOwnerId = async (
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
		const workspace = await ctx.db.get(user.currentWorkspaceId);
		if (workspace) return workspace;
	}

	const workspace = await getWorkspaceByExternalId(
		ctx,
		clerkUser.org_id ? (clerkUser.org_id as string) : user.externalId,
	);

	if (workspace) return workspace;

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
