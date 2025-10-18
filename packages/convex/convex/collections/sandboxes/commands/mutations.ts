import { ConvexError, v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { internalMutation } from "../../../_generated/server";
import { ERRORS } from "../../../utils/errors";

export const createCommand = internalMutation({
	args: {
		cmdId: v.string(),
		sandboxId: v.id("sandboxes"),
		command: v.string(),
		status: v.union(
			v.literal("pending"),
			v.literal("running"),
			v.literal("completed"),
			v.literal("failed"),
			v.literal("error"),
		),
		args: v.array(v.string()),
		cwd: v.string(),
		type: v.union(
			v.literal("install"),
			v.literal("dev"),
			v.literal("build"),
			v.literal("typecheck"),
			v.literal("other"),
		),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		campaignId: v.id("campaigns"),
		agentSessionId: v.id("agentSessions"),
		createdBy: v.id("users"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("sandboxCommands", {
			...args,
			logs: [],
			startedAt: new Date().toISOString(),
		});
	},
});

export const updateCommandStatus = internalMutation({
	args: {
		id: v.id("sandboxCommands"),
		status: v.union(
			v.literal("pending"),
			v.literal("running"),
			v.literal("completed"),
			v.literal("failed"),
			v.literal("error"),
		),
		exitCode: v.optional(v.number()),
	},
	handler: async (ctx, { id, status, exitCode }) => {
		const command = await ctx.db.get(id);
		if (!command) throw new ConvexError(ERRORS.NOT_FOUND);

		const updates: Partial<Doc<"sandboxCommands">> = { status };

		if (exitCode !== undefined) {
			updates.exitCode = exitCode;
		}

		// Calculate duration if completing
		if (status === "completed" || status === "failed" || status === "error") {
			updates.completedAt = new Date().toISOString();
			const duration = Date.now() - new Date(command.startedAt).getTime();
			updates.duration = duration;
		}

		await ctx.db.patch(id, updates);
		return { success: true };
	},
});

export const appendCommandLogs = internalMutation({
	args: {
		cmdId: v.string(),
		logs: v.array(
			v.object({
				stream: v.union(v.literal("stdout"), v.literal("stderr")),
				data: v.string(),
				timestamp: v.string(),
			}),
		),
	},
	handler: async (ctx, { cmdId, logs }) => {
		// Early return if no logs to append
		if (logs.length === 0) return { success: true };

		const command = await ctx.db
			.query("sandboxCommands")
			.withIndex("by_cmd_id", (q) => q.eq("cmdId", cmdId))
			.unique();

		if (!command) throw new ConvexError(ERRORS.NOT_FOUND);

		// Optimize: if existing logs are already at limit, slice from the start
		const maxLogs = 10000;
		const existingLogs = command.logs;
		const totalLogs = existingLogs.length + logs.length;

		let trimmedLogs: typeof logs;
		if (totalLogs > maxLogs) {
			// Calculate how many existing logs to keep
			const logsToKeep = Math.max(0, maxLogs - logs.length);
			trimmedLogs = [
				...existingLogs.slice(existingLogs.length - logsToKeep),
				...logs,
			];
		} else {
			trimmedLogs = [...existingLogs, ...logs];
		}

		await ctx.db.patch(command._id, {
			logs: trimmedLogs,
		});

		return { success: true };
	},
});

export const updateCommandByCmdId = internalMutation({
	args: {
		cmdId: v.string(),
		status: v.optional(
			v.union(
				v.literal("pending"),
				v.literal("running"),
				v.literal("completed"),
				v.literal("failed"),
				v.literal("error"),
			),
		),
		exitCode: v.optional(v.number()),
	},
	handler: async (ctx, { cmdId, status, exitCode }) => {
		const command = await ctx.db
			.query("sandboxCommands")
			.withIndex("by_cmd_id", (q) => q.eq("cmdId", cmdId))
			.unique();

		if (!command) throw new ConvexError(ERRORS.NOT_FOUND);

		const updates: Partial<Doc<"sandboxCommands">> = {};

		if (status) updates.status = status;
		if (exitCode !== undefined) updates.exitCode = exitCode;

		// Calculate duration if completing
		if (
			status &&
			(status === "completed" || status === "failed" || status === "error")
		) {
			updates.completedAt = new Date().toISOString();
			const duration = Date.now() - new Date(command.startedAt).getTime();
			updates.duration = duration;
		}

		await ctx.db.patch(command._id, updates);
		return { success: true };
	},
});
