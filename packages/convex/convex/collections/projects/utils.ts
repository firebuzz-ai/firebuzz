import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export const checkIfSlugIsAvailable = async (
	ctx: QueryCtx | MutationCtx,
	slug: string,
	workspaceId: Id<"workspaces">,
	projectId?: Id<"projects">,
) => {
	const project = await ctx.db
		.query("projects")
		.withIndex("by_slug_workspace_id", (q) =>
			q.eq("slug", slug).eq("workspaceId", workspaceId),
		)
		.filter((q) => (projectId ? q.neq(q.field("_id"), projectId) : true))
		.unique();

	return !project;
};
