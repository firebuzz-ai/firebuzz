import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, mutation } from "../../_generated/server";
import { retrier } from "../../components/actionRetrier";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";
import { sandboxSchema } from "./schema";

export const createInternal = internalMutation({
	args: { ...sandboxSchema.validator.fields },
	handler: async (ctx, args) => {
		return await ctx.db.insert("sandboxes", args);
	},
});

export const updateInternal = internalMutation({
	args: {
		id: v.id("sandboxes"),
		status: v.optional(
			v.union(
				v.literal("running"),
				v.literal("pending"),
				v.literal("failed"),
				v.literal("stopping"),
				v.literal("stopped"),
			),
		),
		duration: v.optional(v.number()),
		sandboxExternalId: v.optional(v.string()),
		startedAt: v.optional(v.string()),
		stoppedAt: v.optional(v.string()),
		isBuilding: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const updates: Partial<Doc<"sandboxes">> = {};
		if (args.status) updates.status = args.status;
		if (args.duration) updates.duration = args.duration;
		if (args.sandboxExternalId)
			updates.sandboxExternalId = args.sandboxExternalId;
		if (args.startedAt) updates.startedAt = args.startedAt;
		if (args.stoppedAt) updates.stoppedAt = args.stoppedAt;
		if ("isBuilding" in args) updates.isBuilding = args.isBuilding;
		await ctx.db.patch(args.id, updates);
	},
});

export const updateCommandIdsInternal = internalMutation({
	args: {
		id: v.id("sandboxes"),
		installCmdId: v.optional(v.id("sandboxCommands")),
		devCmdId: v.optional(v.id("sandboxCommands")),
		buildCmdId: v.optional(v.id("sandboxCommands")),
	},
	handler: async (ctx, args) => {
		const updates: Partial<Doc<"sandboxes">> = {};
		if (args.installCmdId) updates.installCmdId = args.installCmdId;
		if (args.devCmdId) updates.devCmdId = args.devCmdId;
		if (args.buildCmdId) updates.buildCmdId = args.buildCmdId;
		await ctx.db.patch(args.id, updates);
	},
});

export const updatePreviewUrlInternal = internalMutation({
	args: {
		id: v.id("sandboxes"),
		previewUrl: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.id, { previewUrl: args.previewUrl });
	},
});

export const killSandboxInternal = internalMutation({
	args: {
		id: v.id("sandboxes"),
	},
	handler: async (ctx, { id }) => {
		// Get sandbox
		const sandbox = await ctx.db.get(id);
		if (!sandbox) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (
			sandbox.status === "stopped" ||
			sandbox.status === "failed" ||
			sandbox.status === "stopping"
		) {
			console.log("Sandbox already stopped or failed or stopping");
			return;
		}

		// Kill sandbox with retrier
		await retrier.run(ctx, internal.collections.sandboxes.actions.killSandbox, {
			id,
			sandboxExternalId: sandbox.sandboxExternalId,
			startedAt: sandbox.startedAt || new Date().toISOString(),
		});
	},
});

export const killSandboxInternalByExternalId = internalMutation({
	args: {
		externalId: v.string(),
	},
	handler: async (ctx, { externalId }) => {
		const sandbox = await ctx.db
			.query("sandboxes")
			.withIndex("by_sandbox_external_id", (q) =>
				q.eq("sandboxExternalId", externalId),
			)
			.first();
		if (!sandbox) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (
			sandbox.status === "stopped" ||
			sandbox.status === "failed" ||
			sandbox.status === "stopping"
		) {
			console.log("Sandbox already stopped or failed or stopping");
			return;
		}

		// Kill sandbox with retrier
		await retrier.run(ctx, internal.collections.sandboxes.actions.killSandbox, {
			id: sandbox._id,
			sandboxExternalId: sandbox.sandboxExternalId,
			startedAt: sandbox.startedAt || new Date().toISOString(),
		});

		if (sandbox.devCmdId) {
			// Kill dev command
			await ctx.db.patch(sandbox.devCmdId, {
				status: "completed",
			});
		}
	},
});

/**
 * Renew sandbox - creates a new sandbox for a renewed agent session
 * Public mutation that users can call to renew sandbox when renewing session
 */
export const renew = mutation({
	args: {
		sessionId: v.id("agentSessions"),
	},
	handler: async (ctx, { sessionId }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const session = await ctx.db.get(sessionId);
		if (!session) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (session.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		if (session.status !== "active") {
			throw new ConvexError("Session is not active");
		}

		// Get existing sandbox to extract config
		const existingSandbox = session.sandboxId
			? await ctx.db.get(session.sandboxId)
			: null;

		// Use existing config or defaults
		const config = existingSandbox
			? {
					timeout: existingSandbox.timeout,
					vcpus: existingSandbox.vcpus,
					runtime: existingSandbox.runtime,
					ports: existingSandbox.ports,
					cwd: existingSandbox.cwd,
				}
			: {
					timeout: 30 * 60 * 1000 + 2 * 60 * 1000,
					ports: [5173],
					vcpus: 2 as const,
					runtime: "node22" as const,
					cwd: "/vercel/sandbox" as const,
				};

		// Renew sandbox
		await retrier.run(
			ctx,
			internal.collections.sandboxes.actions.renewSandboxSession,
			{ sessionId, config },
		);
	},
});
