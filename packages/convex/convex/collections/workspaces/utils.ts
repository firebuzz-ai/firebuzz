import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export const getWorkspaceById = async (
	ctx: QueryCtx | MutationCtx,
	id: Id<"workspaces">,
) => {
	const workspace = await ctx.db.get(id);
	return workspace;
};

export const getWorkspaceByExternalId = async (
	ctx: QueryCtx | MutationCtx,
	externalId: string,
) => {
	const workspace = await ctx.db
		.query("workspaces")
		.withIndex("by_external_id", (q) => q.eq("externalId", externalId))
		.unique();
	return workspace;
};
