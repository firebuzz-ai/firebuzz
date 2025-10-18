import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, mutation } from "../../_generated/server";
import { modelSchema } from "../../ai/models/schema";
import { retrier } from "../../components/actionRetrier";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";

const SESSION_CONFIG = {
	maxDuration: 60 * 60 * 1000, // 60 minutes
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
			const latestSession = await ctx.db
				.query("agentSessions")
				.withIndex("by_landing_page_id", (q) =>
					q.eq("landingPageId", assetSettings.id),
				)
				.order("desc")
				.first();

			// Check if we have an active session
			const activeSession =
				latestSession?.status === "active" ? latestSession : null;

			// A) NEW SESSION ROUTE
			if (!activeSession) {
				// Use the latest completed session for copying values
				const latestCompletedSession =
					latestSession?.status === "completed" ? latestSession : null;

				sessionId = await ctx.db.insert("agentSessions", {
					workspaceId: user.currentWorkspaceId,
					projectId: campaign.projectId,
					campaignId,
					createdBy: user._id,
					startedAt: new Date().toISOString(),
					messageQueue: [],
					todoList: latestCompletedSession?.todoList ?? [],
					devServerErrors: [],
					autoErrorFix: latestCompletedSession?.autoErrorFix ?? true,
					model: latestCompletedSession?.model ?? "gemini-2.5-pro",
					knowledgeBases: latestCompletedSession?.knowledgeBases,
					joinedUsers: [user._id],
					sessionType: "regular",
					status: "active",
					assetType: "landingPage",
					landingPageId: assetSettings.id,
					maxDuration: SESSION_CONFIG.maxDuration,
					maxIdleTime: SESSION_CONFIG.maxIdleTime,
					attachments: [],
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
				sessionId = activeSession._id;
				// Insert users into session joinedUsers (if not already in the array)
				if (!activeSession.joinedUsers.includes(user._id)) {
					await ctx.db.patch(activeSession._id, {
						joinedUsers: Array.from(
							new Set([...activeSession.joinedUsers, user._id]),
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

/**
 * Renew session - create a new session from a completed session
 * Duplicates reusable values like model, knowledge bases, and starts sandbox creation
 */
export const renewSession = mutation({
	args: {
		completedSessionId: v.id("agentSessions"),
	},
	handler: async (ctx, { completedSessionId }) => {
		// Authenticate user
		const user = await getCurrentUserWithWorkspace(ctx);

		// Get completed session
		const completedSession = await ctx.db.get(completedSessionId);

		if (!completedSession) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Check if session is in same workspace
		if (completedSession.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Check if session is completed
		if (completedSession.status !== "completed") {
			throw new ConvexError("Can only renew completed sessions");
		}

		// Get campaign
		const campaign = await ctx.db.get(completedSession.campaignId);

		if (!campaign) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Prepare joined users (keep existing users and add current user if not already in)
		const joinedUsers = completedSession.joinedUsers.includes(user._id)
			? completedSession.joinedUsers
			: [...completedSession.joinedUsers, user._id];

		// LANDING PAGE
		if (completedSession.assetType === "landingPage") {
			// Get Asset
			const asset = await ctx.db.get(completedSession.landingPageId);

			if (!asset) {
				throw new ConvexError(ERRORS.NOT_FOUND);
			}

			// Create new session with reusable values from completed session
			const sessionId = await ctx.db.insert("agentSessions", {
				workspaceId: completedSession.workspaceId,
				projectId: completedSession.projectId,
				campaignId: completedSession.campaignId,
				createdBy: user._id,
				startedAt: new Date().toISOString(),
				messageQueue: [],
				todoList: [],
				devServerErrors: [],
				autoErrorFix: completedSession.autoErrorFix,
				model: completedSession.model,
				knowledgeBases: completedSession.knowledgeBases,
				joinedUsers,
				sessionType: "regular",
				status: "active",
				assetType: "landingPage",
				landingPageId: completedSession.landingPageId,
				maxDuration: SESSION_CONFIG.maxDuration,
				maxIdleTime: SESSION_CONFIG.maxIdleTime,
				attachments: [],
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
					assetSettings: {
						type: "landingPage",
						id: completedSession.landingPageId,
					},
					config: SANDBOX_CONFIG,
				},
			);

			return sessionId;
		}

		// FORM (if needed in the future)
		if (completedSession.assetType === "form") {
			// Get Asset
			const asset = await ctx.db.get(completedSession.formId);

			if (!asset) {
				throw new ConvexError(ERRORS.NOT_FOUND);
			}

			// Create new session with reusable values from completed session
			const sessionId = await ctx.db.insert("agentSessions", {
				workspaceId: completedSession.workspaceId,
				projectId: completedSession.projectId,
				campaignId: completedSession.campaignId,
				createdBy: user._id,
				startedAt: new Date().toISOString(),
				messageQueue: [],
				todoList: [],
				devServerErrors: [],
				autoErrorFix: completedSession.autoErrorFix,
				model: completedSession.model,
				knowledgeBases: completedSession.knowledgeBases,
				joinedUsers,
				sessionType: "regular",
				status: "active",
				assetType: "form",
				formId: completedSession.formId,
				maxDuration: SESSION_CONFIG.maxDuration,
				maxIdleTime: SESSION_CONFIG.maxIdleTime,
				attachments: [],
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
					assetSettings: {
						type: "form",
						id: completedSession.formId,
					},
					config: SANDBOX_CONFIG,
				},
			);

			return sessionId;
		}
	},
});

/**
 * Add attachment to session
 */
export const addAttachment = mutation({
	args: {
		sessionId: v.id("agentSessions"),
		attachment: v.union(
			v.object({
				type: v.literal("media"),
				id: v.id("media"),
			}),
			v.object({
				type: v.literal("document"),
				id: v.id("documents"),
			}),
		),
	},
	handler: async (ctx, { sessionId, attachment }) => {
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

		// Check if attachment already exists
		const existingAttachment = session.attachments.find(
			(att) => att.id === attachment.id && att.type === attachment.type,
		);

		if (existingAttachment) {
			return { success: true, attachments: session.attachments };
		}

		const newAttachments = [...session.attachments, attachment];

		await ctx.db.patch(sessionId, {
			attachments: newAttachments,
			updatedAt: new Date().toISOString(),
		});

		return { success: true, attachments: newAttachments };
	},
});

/**
 * Remove attachment from session
 */
export const removeAttachment = mutation({
	args: {
		sessionId: v.id("agentSessions"),
		attachment: v.union(
			v.object({
				type: v.literal("media"),
				id: v.id("media"),
			}),
			v.object({
				type: v.literal("document"),
				id: v.id("documents"),
			}),
		),
	},
	handler: async (ctx, { sessionId, attachment }) => {
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

		const newAttachments = session.attachments.filter(
			(att) => !(att.id === attachment.id && att.type === attachment.type),
		);

		await ctx.db.patch(sessionId, {
			attachments: newAttachments,
			updatedAt: new Date().toISOString(),
		});

		return { success: true, attachments: newAttachments };
	},
});

/**
 * Clear all attachments from session
 */
export const clearAttachments = mutation({
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

		await ctx.db.patch(sessionId, {
			attachments: [],
			updatedAt: new Date().toISOString(),
		});

		return { success: true };
	},
});

/**
 * Add message to queue
 */
export const addMessageToQueue = mutation({
	args: {
		sessionId: v.id("agentSessions"),
		id: v.string(), // Unique identifier from client (nanoid)
		prompt: v.string(),
		attachments: v.array(
			v.union(
				v.object({ type: v.literal("media"), id: v.id("media") }),
				v.object({ type: v.literal("document"), id: v.id("documents") }),
			),
		),
	},
	handler: async (ctx, { sessionId, id, prompt, attachments }) => {
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

		// Add new message to the end of the queue with attachments
		const newMessage = {
			id,
			prompt,
			createdAt: new Date().toISOString(),
			createdBy: user._id,
			order: session.messageQueue.length,
			attachments, // Store attachments with the queued message
		};

		const newMessageQueue = [...session.messageQueue, newMessage];

		// Clear session attachments after adding to queue (like sendMessage does)
		await ctx.db.patch(sessionId, {
			messageQueue: newMessageQueue,
			attachments: [], // Clear attachments
			updatedAt: new Date().toISOString(),
		});

		return { success: true, messageQueue: newMessageQueue };
	},
});

/**
 * Process next queued message (internal use only)
 */
export const processNextQueuedMessageInternal = internalMutation({
	args: {
		sessionId: v.id("agentSessions"),
	},
	handler: async (ctx, { sessionId }) => {
		const session = await ctx.db.get(sessionId);

		if (!session) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (session.assetType !== "landingPage") {
			throw new ConvexError("Session is not for a landing page");
		}

		// Get first message from queue
		const firstMessage = session.messageQueue.find((msg) => msg.order === 0);

		if (!firstMessage) {
			console.log("[Queue] No messages in queue");
			return;
		}

		// Get landing page for threadId
		const landingPage = await ctx.db.get(session.landingPageId);

		if (!landingPage || !landingPage.threadId) {
			throw new ConvexError("Landing page or thread not found");
		}

		// Send message using internal mutation with attachments from queue
		await ctx.runMutation(
			internal.components.agent.sendMessageToLandingPageRegularAgentInternal,
			{
				threadId: landingPage.threadId,
				prompt: firstMessage.prompt,
				sessionId,
				model: session.model,
				knowledgeBases: session.knowledgeBases || [],
				userId: firstMessage.createdBy,
				attachments: firstMessage.attachments,
			},
		);

		// Remove processed message and reorder queue
		const newMessageQueue = session.messageQueue
			.filter((msg) => msg.order !== 0)
			.map((msg, index) => ({
				...msg,
				order: index,
			}));

		await ctx.db.patch(sessionId, {
			messageQueue: newMessageQueue,
			updatedAt: new Date().toISOString(),
		});

		console.log(`[Queue] Processed message, ${newMessageQueue.length} remaining`);

		return { success: true, remainingMessages: newMessageQueue.length };
	},
});

/**
 * Remove queued message from session
 */
export const removeQueuedMessage = mutation({
	args: {
		sessionId: v.id("agentSessions"),
		order: v.number(),
	},
	handler: async (ctx, { sessionId, order }) => {
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

		// Remove message with matching order and reorder remaining messages
		const newMessageQueue = session.messageQueue
			.filter((msg) => msg.order !== order)
			.map((msg, index) => ({
				...msg,
				order: index,
			}));

		await ctx.db.patch(sessionId, {
			messageQueue: newMessageQueue,
			updatedAt: new Date().toISOString(),
		});

		return { success: true, messageQueue: newMessageQueue };
	},
});
