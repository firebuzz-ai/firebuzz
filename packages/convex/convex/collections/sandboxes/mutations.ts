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
	},
	handler: async (ctx, args) => {
		const updates: Partial<Doc<"sandboxes">> = {};
		if (args.status) updates.status = args.status;
		if (args.duration) updates.duration = args.duration;
		if (args.sandboxExternalId)
			updates.sandboxExternalId = args.sandboxExternalId;
		if (args.startedAt) updates.startedAt = args.startedAt;
		if (args.stoppedAt) updates.stoppedAt = args.stoppedAt;
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

export const updateBuildStatusInternal = internalMutation({
	args: {
		id: v.id("sandboxes"),
		isBuilding: v.boolean(),
	},
	handler: async (ctx, { id, isBuilding }) => {
		await ctx.db.patch(id, { isBuilding });
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
	},
});

export const recreate = mutation({
	args: {
		sessionId: v.id("agentSessions"),
		existingSandboxId: v.id("sandboxes"),
	},
	handler: async (ctx, { sessionId, existingSandboxId }) => {
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

		if (session.sandboxId !== existingSandboxId) {
			throw new ConvexError("Session does not have the existing sandbox");
		}

		const existingSandbox = await ctx.db.get(existingSandboxId);
		if (!existingSandbox) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		const config = {
			timeout: existingSandbox.timeout,
			vcpus: existingSandbox.vcpus,
			runtime: existingSandbox.runtime,
			ports: existingSandbox.ports,
			cwd: existingSandbox.cwd,
		};

		// Update sandboxId in session
		await ctx.db.patch(sessionId, {
			sandboxId: undefined,
		});

		// Recreate sandbox
		await retrier.run(
			ctx,
			internal.collections.sandboxes.actions.recreateSandboxSession,
			{ sessionId, config },
		);
	},
});
