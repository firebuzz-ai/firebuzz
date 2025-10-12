import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, mutation } from "../../_generated/server";
import { modelSchema } from "../../ai/models/schema";
import { retrier } from "../../components/actionRetrier";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";

const SESSION_CONFIG = {
	maxDuration: 30 * 60 * 1000, // 30 minutes
	maxIdleTime: 10 * 60 * 1000, // 10 minutes
};

const SANDBOX_CONFIG = {
	timeout: SESSION_CONFIG.maxDuration + 2 * 60 * 1000, // Session timeout + 2 minutes
	ports: [5173],
	vcpus: 2 as const,
	runtime: "node22" as const,
	cwd: "/vercel/sandbox" as const,
};

export const joinOrCreateSession = mutation({
	args: {
		assetSettings: v.union(
			v.object({
				type: v.literal("landingPage"),
				id: v.id("landingPages"),
			}),
			v.object({
				type: v.literal("form"),
				id: v.id("forms"),
			}),
		),
		campaignId: v.id("campaigns"),
	},
	handler: async (ctx, { assetSettings, campaignId }) => {
		// Authenticate user
		const user = await getCurrentUserWithWorkspace(ctx);

		// Get campaign
		const campaign = await ctx.db.get(campaignId);

		if (!campaign) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Check if campaign is in same workspace
		if (campaign.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// LANDING PAGE
		if (assetSettings.type === "landingPage") {
			// Get Asset (It's only landing page for now)
			const asset = await ctx.db.get(assetSettings.id);

			if (!asset) {
				throw new ConvexError(ERRORS.NOT_FOUND);
			}

			if (asset.workspaceId !== user.currentWorkspaceId) {
				throw new ConvexError(ERRORS.UNAUTHORIZED);
			}

			let sessionId: Id<"agentSessions"> | null = null;
			const session = await ctx.db
				.query("agentSessions")
				.withIndex("by_landing_page_id", (q) =>
					q.eq("landingPageId", assetSettings.id),
				)
				.filter((q) => q.eq(q.field("status"), "active"))
				.first();

			// A) NEW SESSION ROUTE
			if (!session) {
				sessionId = await ctx.db.insert("agentSessions", {
					workspaceId: user.currentWorkspaceId,
					projectId: campaign.projectId,
					campaignId,
					createdBy: user._id,
					startedAt: new Date().toISOString(),
					messageQueue: [],
					todoList: [],
					devServerErrors: [],
					autoErrorFix: true,
					model: "gemini-2.5-pro",
					joinedUsers: [user._id],
					sessionType: "regular",
					status: "active",
					assetType: "landingPage",
					landingPageId: assetSettings.id,
					maxDuration: SESSION_CONFIG.maxDuration,
					maxIdleTime: SESSION_CONFIG.maxIdleTime,
				});

				// Initialize Agent Session Durable Object
				await retrier.run(
					ctx,
					internal.collections.agentSessions.actions.initializeAgentSessionDO,
					{
						sessionId,
						maxDuration: SESSION_CONFIG.maxDuration,
						maxIdleTime: SESSION_CONFIG.maxIdleTime,
					},
				);

				// Create or get sandbox session
				await ctx.scheduler.runAfter(
					0,
					internal.collections.sandboxes.actions.createOrGetSandboxSession,
					{
						sessionId,
						assetSettings: assetSettings,
						config: SANDBOX_CONFIG,
					},
				);
			}
			// B) EXISTING SESSION ROUTE
			else {
				// Assign sessionId to existing session
				sessionId = session._id;
				// Insert users into session joinedUsers (if not already in the array)
				if (!session.joinedUsers.includes(user._id)) {
					await ctx.db.patch(session._id, {
						joinedUsers: Array.from(
							new Set([...session.joinedUsers, user._id]),
						),
					});
				}
			}

			return sessionId;
		}
	},
});

export const updateSandboxId = internalMutation({
	args: {
		sessionId: v.id("agentSessions"),
		sandboxId: v.id("sandboxes"),
	},
	handler: async (ctx, { sessionId, sandboxId }) => {
		return await ctx.db.patch(sessionId, {
			sandboxId,
		});
	},
});

export const updateModel = mutation({
	args: {
		sessionId: v.id("agentSessions"),
		model: modelSchema,
	},
	handler: async (ctx, { sessionId, model }) => {
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

		return await ctx.db.patch(sessionId, {
			model,
		});
	},
});

export const updateKnowledgeBases = mutation({
	args: {
		sessionId: v.id("agentSessions"),
		knowledgeBases: v.array(v.id("knowledgeBases")),
	},
	handler: async (ctx, { sessionId, knowledgeBases }) => {
		return await ctx.db.patch(sessionId, {
			knowledgeBases,
		});
	},
});

export const scheduleSessionOver = internalMutation({
	args: {
		sessionId: v.id("agentSessions"),
		reason: v.union(v.literal("idle"), v.literal("max-duration")),
		delay: v.number(), // milliseconds
	},
	handler: async (ctx, { sessionId, reason, delay }) => {
		const session = await ctx.db.get(sessionId);

		if (!session) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Cancel any existing scheduled shutdown
		if (session.scheduledId) {
			await ctx.scheduler.cancel(session.scheduledId);
		}

		// Schedule the session to end
		const scheduledId: Id<"_scheduled_functions"> =
			await ctx.scheduler.runAfter(
				delay,
				internal.collections.agentSessions.mutations.endSession,
				{
					sessionId,
					reason,
				},
			);

		// Update session with shutdown info
		await ctx.db.patch(sessionId, {
			shutdownAt: new Date(Date.now() + delay).toISOString(),
			scheduledId,
			shutdownReason: reason,
		});

		return { success: true, scheduledId };
	},
});

export const extendSessionPublic = mutation({
	args: {
		sessionId: v.id("agentSessions"),
	},
	handler: async (ctx, { sessionId }) => {
		// Authenticate user
		const user = await getCurrentUserWithWorkspace(ctx);

		const session = await ctx.db.get(sessionId);

		if (!session) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Check if user is part of the session
		if (!session.joinedUsers.includes(user._id)) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Cancel any scheduled shutdown
		if (session.scheduledId) {
			await ctx.scheduler.cancel(session.scheduledId);
		}

		// Clear shutdown fields
		await ctx.db.patch(sessionId, {
			shutdownAt: undefined,
			scheduledId: undefined,
			shutdownReason: undefined,
			updatedAt: new Date().toISOString(),
		});

		// Extend session in DO
		await ctx.scheduler.runAfter(
			0,
			internal.collections.agentSessions.actions.extendAgentSession,
			{
				sessionId,
			},
		);

		return { success: true };
	},
});

export const extendSession = internalMutation({
	args: {
		sessionId: v.id("agentSessions"),
	},
	handler: async (ctx, { sessionId }) => {
		const session = await ctx.db.get(sessionId);

		if (!session) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Cancel any scheduled shutdown
		if (session.scheduledId) {
			await ctx.scheduler.cancel(session.scheduledId);
		}

		// Clear shutdown fields
		await ctx.db.patch(sessionId, {
			shutdownAt: undefined,
			scheduledId: undefined,
			shutdownReason: undefined,
			updatedAt: new Date().toISOString(),
		});

		// Extend session in DO
		await ctx.scheduler.runAfter(
			0,
			internal.collections.agentSessions.actions.extendAgentSession,
			{
				sessionId,
			},
		);

		return { success: true };
	},
});

export const endSession = internalMutation({
	args: {
		sessionId: v.id("agentSessions"),
		reason: v.union(v.literal("idle"), v.literal("max-duration")),
	},
	handler: async (ctx, { sessionId, reason }) => {
		const session = await ctx.db.get(sessionId);

		if (!session) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Kill sandbox if exists
		if (session.sandboxId) {
			await ctx.runMutation(
				internal.collections.sandboxes.mutations.killSandboxInternal,
				{
					id: session.sandboxId,
				},
			);
		}

		// Update session to completed
		await ctx.db.patch(sessionId, {
			status: "completed",
			endedAt: new Date().toISOString(),
			shutdownReason: reason,
			scheduledId: undefined,
		});

		// Sync token and credit usages to Tinybird
		await ctx.scheduler.runAfter(
			0,
			internal.collections.tokenUsage.utils.batchAggregateAndSyncWithTinybird,
			{ sessionId, numItems: 100 },
		);

		await ctx.scheduler.runAfter(
			0,
			internal.collections.stripe.transactions.utils
				.batchAggregateAndSyncWithTinybird,
			{ sessionId, numItems: 100 },
		);

		return { success: true };
	},
});

export const createTodoList = internalMutation({
	args: {
		sessionId: v.id("agentSessions"),
		todos: v.array(
			v.object({
				title: v.string(),
				description: v.string(),
			}),
		),
	},
	handler: async (ctx, { sessionId, todos }) => {
		const session = await ctx.db.get(sessionId);

		if (!session) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Create new todo list with generated IDs and proper order
		const todoList = todos.map((todo, index) => ({
			id: crypto.randomUUID(),
			title: todo.title,
			description: todo.description,
			status: "todo" as const,
			createdAt: new Date().toISOString(),
			order: index,
		}));

		// Replace existing todo list
		await ctx.db.patch(sessionId, {
			todoList,
			updatedAt: new Date().toISOString(),
		});

		return { success: true, todos: todoList };
	},
});

export const updateTodoList = internalMutation({
	args: {
		sessionId: v.id("agentSessions"),
		operation: v.union(
			v.literal("add"),
			v.literal("update"),
			v.literal("delete"),
		),
		todo: v.object({
			id: v.optional(v.string()),
			title: v.optional(v.string()),
			description: v.optional(v.string()),
			status: v.optional(
				v.union(
					v.literal("todo"),
					v.literal("in-progress"),
					v.literal("completed"),
					v.literal("cancelled"),
					v.literal("failed"),
				),
			),
		}),
	},
	handler: async (ctx, { sessionId, operation, todo }) => {
		const session = await ctx.db.get(sessionId);

		if (!session) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		let todoList = [...session.todoList];

		if (operation === "add") {
			// Add new todo to the end
			if (!todo.title || !todo.description) {
				throw new ConvexError(
					"Title and description are required for adding a todo",
				);
			}

			todoList.push({
				id: crypto.randomUUID(),
				title: todo.title,
				description: todo.description,
				status: "todo" as const,
				createdAt: new Date().toISOString(),
				order: todoList.length,
			});
		} else if (operation === "update") {
			// Update existing todo by ID
			if (!todo.id) {
				throw new ConvexError("Todo ID is required for updating");
			}

			const index = todoList.findIndex((t) => t.id === todo.id);
			if (index === -1) {
				throw new ConvexError("Todo not found");
			}

			const existingTodo = todoList[index];
			if (!existingTodo) {
				throw new ConvexError("Todo not found");
			}

			if (todo.title !== undefined) {
				existingTodo.title = todo.title;
			}
			if (todo.description !== undefined) {
				existingTodo.description = todo.description;
			}
			if (todo.status !== undefined) {
				existingTodo.status = todo.status;
			}
		} else if (operation === "delete") {
			// Delete todo by ID and reorder
			if (!todo.id) {
				throw new ConvexError("Todo ID is required for deleting");
			}

			todoList = todoList.filter((t) => t.id !== todo.id);

			// Reorder remaining todos
			todoList = todoList.map((t, index) => ({
				...t,
				order: index,
			}));
		}

		// Update session
		await ctx.db.patch(sessionId, {
			todoList,
			updatedAt: new Date().toISOString(),
		});

		return { success: true, todos: todoList };
	},
});

/**
 * Add dev server error to session
 */
export const addDevServerError = internalMutation({
	args: {
		sessionId: v.id("agentSessions"),
		errorHash: v.string(),
		errorMessage: v.string(),
	},
	handler: async (ctx, { sessionId, errorHash, errorMessage }) => {
		console.log(
			`[addDevServerError] Starting - sessionId: ${sessionId}, errorHash: ${errorHash}`,
		);

		const session = await ctx.db.get(sessionId);

		if (!session) {
			console.error(`[addDevServerError] Session not found: ${sessionId}`);
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		console.log(
			`[addDevServerError] Session found, current errors: ${session.devServerErrors?.length || 0}, autoErrorFix: ${session.autoErrorFix}`,
		);

		// Check if error already exists
		const devServerErrors = session.devServerErrors || [];
		const existingError = devServerErrors.find(
			(e) => e.errorHash === errorHash,
		);

		if (existingError) {
			console.log(`[addDevServerError] Error already exists: ${errorHash}`);
			return { isNew: false, error: existingError };
		}

		// Add new error with message (will be removed after applied)
		const newError = {
			errorHash,
			errorMessage,
			detectedAt: new Date().toISOString(),
			isAutoFixEnabled: session.autoErrorFix || false,
		};

		await ctx.db.patch(sessionId, {
			devServerErrors: [...devServerErrors, newError],
			updatedAt: new Date().toISOString(),
		});

		console.log(
			`[addDevServerError] New error added: ${errorHash}, total errors: ${devServerErrors.length + 1}`,
		);
		return { isNew: true, error: newError };
	},
});

/**
 * Remove error from session after applied to thread
 */
export const removeAppliedDevServerError = internalMutation({
	args: {
		sessionId: v.id("agentSessions"),
	},
	handler: async (ctx, { sessionId }) => {
		const session = await ctx.db.get(sessionId);

		if (!session) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		await ctx.db.patch(sessionId, {
			devServerErrors: [],
			updatedAt: new Date().toISOString(),
		});
	},
});
