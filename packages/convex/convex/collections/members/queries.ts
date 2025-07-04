import { asyncMap } from "convex-helpers";
import { ConvexError } from "convex/values";
import { query } from "../../_generated/server";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";

export const getByWorkspace = query({
	handler: async (ctx) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		if (!user || !user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		const members = await ctx.db
			.query("members")
			.withIndex("by_workspace_id", (q) =>
				q.eq("workspaceId", user.currentWorkspaceId),
			)
			.collect();

		const membersWithUserData = await asyncMap(members, async (member) => {
			const user = await ctx.db.get(member.userId);
			return {
				...member,
				user,
			};
		});

		return membersWithUserData;
	},
});
