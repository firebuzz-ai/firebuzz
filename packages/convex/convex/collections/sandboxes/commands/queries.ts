import { v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";

export const getBySandboxId = internalQuery({
	args: { sandboxId: v.id("sandboxes") },
	handler: async (ctx, { sandboxId }) => {
		return await ctx.db
			.query("sandboxCommands")
			.withIndex("by_sandbox_id", (q) => q.eq("sandboxId", sandboxId))
			.collect();
	},
});

export const getCommandLogs = query({
	args: { cmdId: v.string() },
	handler: async (ctx, { cmdId }) => {
		const command = await ctx.db
			.query("sandboxCommands")
			.withIndex("by_cmd_id", (q) => q.eq("cmdId", cmdId))
			.unique();

		if (!command) {
			return null;
		}

		return {
			logs: command.logs,
			status: command.status,
			exitCode: command.exitCode,
			type: command.type,
			startedAt: command.startedAt,
			completedAt: command.completedAt,
		};
	},
});

export const getAllCommandsBySandbox = query({
	args: { sandboxId: v.id("sandboxes") },
	handler: async (ctx, { sandboxId }) => {
		const commands = await ctx.db
			.query("sandboxCommands")
			.withIndex("by_sandbox_id", (q) => q.eq("sandboxId", sandboxId))
			.collect();

		return commands.map((cmd) => ({
			_id: cmd._id,
			cmdId: cmd.cmdId,
			type: cmd.type,
			status: cmd.status,
			exitCode: cmd.exitCode,
			logs: cmd.logs,
			startedAt: cmd.startedAt,
			completedAt: cmd.completedAt,
			command: cmd.command,
			args: cmd.args,
		}));
	},
});

export const getByAgentSessionId = internalQuery({
	args: { agentSessionId: v.id("agentSessions") },
	handler: async (ctx, { agentSessionId }) => {
		return await ctx.db
			.query("sandboxCommands")
			.withIndex("by_agent_session_id", (q) =>
				q.eq("agentSessionId", agentSessionId),
			)
			.collect();
	},
});

export const getByCmdId = internalQuery({
	args: { cmdId: v.string() },
	handler: async (ctx, { cmdId }) => {
		return await ctx.db
			.query("sandboxCommands")
			.withIndex("by_cmd_id", (q) => q.eq("cmdId", cmdId))
			.unique();
	},
});

export const getDevCommandBySandboxId = internalQuery({
	args: { sandboxId: v.id("sandboxes") },
	handler: async (ctx, { sandboxId }) => {
		return await ctx.db
			.query("sandboxCommands")
			.withIndex("by_type_and_sandbox", (q) =>
				q.eq("type", "dev").eq("sandboxId", sandboxId),
			)
			.order("desc")
			.first();
	},
});
