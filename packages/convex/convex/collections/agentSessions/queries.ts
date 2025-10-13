import type { Doc } from "_generated/dataModel";
import { asyncMap } from "convex-helpers";
import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";

export const getById = query({
	args: {
		id: v.id("agentSessions"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		const agentSession = await ctx.db.get(args.id);

		if (!agentSession) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (agentSession.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const joinedUsers = await asyncMap(
			agentSession.joinedUsers,
			async (userId) => {
				return await ctx.db.get(userId);
			},
		);

		const filteredJoinedUsers = joinedUsers.filter(
			(user) => user !== undefined && user !== null,
		) as Doc<"users">[];

		return {
			...agentSession,
			joinedUsers: filteredJoinedUsers,
		};
	},
});

export const getByIdInternal = internalQuery({
	args: {
		id: v.id("agentSessions"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const getByActiveSandboxIdInternal = internalQuery({
	args: {
		sandboxId: v.id("sandboxes"),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("agentSessions")
			.filter((q) =>
				q.and(
					q.eq(q.field("sandboxId"), args.sandboxId),
					q.eq(q.field("status"), "active"),
				),
			)
			.first();
	},
});
