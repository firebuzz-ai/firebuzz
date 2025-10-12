import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";

export const getById = query({
	args: {
		id: v.id("sandboxes"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		const sandbox = await ctx.db.get(args.id);

		if (!sandbox) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (sandbox.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		return sandbox;
	},
});

export const getByIdInternal = internalQuery({
	args: {
		id: v.id("sandboxes"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const getAllRunningInternal = internalQuery({
	handler: async (ctx) => {
		return await ctx.db
			.query("sandboxes")
			.withIndex("by_status", (q) => q.eq("status", "running"))
			.collect();
	},
});

export const getByExternalIdInternal = internalQuery({
	args: {
		externalId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("sandboxes")
			.withIndex("by_sandbox_external_id", (q) =>
				q.eq("sandboxExternalId", args.externalId),
			)
			.first();
	},
});

export const getByAgentSessionId = query({
	args: {
		agentSessionId: v.id("agentSessions"),
	},
	handler: async (ctx, { agentSessionId }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		const sandbox = await ctx.db
			.query("sandboxes")
			.withIndex("by_agent_session_id", (q) =>
				q.eq("agentSessionId", agentSessionId),
			)
			.first();

		if (!sandbox) {
			return null;
		}

		if (sandbox.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		return sandbox;
	},
});
