"use node";

import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { engineAPIClient } from "../../lib/engine";

interface TodoItem {
	id: string;
	title: string;
	description: string;
	status: "todo" | "in-progress" | "completed" | "cancelled" | "failed";
	createdAt: string;
	order: number;
}

interface TodoResult {
	success: boolean;
	todos: TodoItem[] | null;
	error: { message: string } | null;
}

/**
 * Initialize Agent Session Durable Object
 * Called when a new session is created with a sandbox
 */
export const initializeAgentSessionDO = internalAction({
	args: {
		sessionId: v.id("agentSessions"),
		maxDuration: v.optional(v.number()),
		maxIdleTime: v.optional(v.number()),
	},
	handler: async (_ctx, { sessionId, maxDuration, maxIdleTime }) => {
		try {
			const response = await engineAPIClient.do[
				"agent-session"
			].initialize.$post({
				json: {
					sessionId,
					maxDuration: maxDuration || 30 * 60 * 1000, // 30 minutes default
					maxIdleTime: maxIdleTime || 5 * 60 * 1000, // 5 minutes default
				},
			});

			if (!response.ok) {
				const error = await response.json();
				throw new ConvexError({
					message: "Failed to initialize agent session DO",
					data: { error, status: response.status },
				});
			}

			const data = await response.json();
			console.log("Agent session DO initialized:", data);

			return data;
		} catch (error) {
			console.error("Failed to initialize agent session DO:", error);
			throw error;
		}
	},
});

/**
 * Extend agent session (called when user continues after idle warning)
 */
export const extendAgentSession = internalAction({
	args: {
		sessionId: v.id("agentSessions"),
	},
	handler: async (_ctx, { sessionId }) => {
		try {
			const response = await engineAPIClient.do["agent-session"].extend.$post({
				json: {
					sessionId,
				},
			});

			if (!response.ok) {
				const error = await response.json();
				throw new ConvexError({
					message: "Failed to extend agent session",
					data: { error, status: response.status },
				});
			}

			const data = await response.json();
			console.log("Agent session extended:", data);

			return data;
		} catch (error) {
			console.error("Failed to extend agent session:", error);
			throw error;
		}
	},
});

/**
 * Send heartbeat to update activity timestamp in DO
 * Called when user performs actions (chat, edits, etc.)
 */
export const sendHeartbeatToAgentSession = internalAction({
	args: {
		sessionId: v.id("agentSessions"),
	},
	handler: async (_ctx, { sessionId }) => {
		try {
			const response = await engineAPIClient.do[
				"agent-session"
			].heartbeat.$post({
				json: {
					sessionId,
				},
			});

			if (!response.ok) {
				const error = await response.json();
				console.warn("Failed to send heartbeat:", error);
				return { success: false };
			}

			const data = await response.json();
			return data;
		} catch (error) {
			console.warn("Failed to send heartbeat:", error);
			return { success: false };
		}
	},
});

/**
 * Create Todo List Tool
 * Creates a fresh todo list, replacing any existing one
 */
export const createTodoListTool = internalAction({
	args: {
		sessionId: v.id("agentSessions"),
		todos: v.array(
			v.object({
				title: v.string(),
				description: v.string(),
			}),
		),
	},
	handler: async (ctx, { sessionId, todos }): Promise<TodoResult> => {
		try {
			if (todos.length === 0) {
				return {
					success: false,
					todos: null,
					error: { message: "At least one todo is required" },
				};
			}

			const result = await ctx.runMutation(
				internal.collections.agentSessions.mutations.createTodoList,
				{
					sessionId,
					todos,
				},
			);

			return {
				success: true,
				todos: result.todos,
				error: null,
			};
		} catch (error) {
			console.error("[createTodoListTool] Error:", error);
			return {
				success: false,
				todos: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

/**
 * Update Todo List Tool
 * Add, update, or delete todos from the list
 */
export const updateTodoListTool = internalAction({
	args: {
		sessionId: v.id("agentSessions"),
		operations: v.array(
			v.object({
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
			}),
		),
	},
	handler: async (ctx, { sessionId, operations }): Promise<TodoResult> => {
		try {
			// Process operations sequentially to maintain order
			let currentTodos = null;

			for (const { operation, todo } of operations) {
				const result = await ctx.runMutation(
					internal.collections.agentSessions.mutations.updateTodoList,
					{
						sessionId,
						operation,
						todo,
					},
				);
				currentTodos = result.todos;
			}

			return {
				success: true,
				todos: currentTodos,
				error: null,
			};
		} catch (error) {
			console.error("[updateTodoListTool] Error:", error);
			return {
				success: false,
				todos: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

/**
 * Process dev server error - add to session and trigger analysis
 */
export const processDevServerError = internalAction({
	args: {
		sessionId: v.id("agentSessions"),
		errorHash: v.string(),
		errorMessage: v.string(),
		sandboxId: v.string(),
	},
	handler: async (ctx, args): Promise<void> => {
		console.log(
			`[processDevServerError] Starting - sessionId: ${args.sessionId}, errorHash: ${args.errorHash}`,
		);

		try {
			// Just store the error hash immediately - analysis happens later in batch
			const result = await ctx.runMutation(
				internal.collections.agentSessions.mutations.addDevServerError,
				{
					sessionId: args.sessionId,
					errorHash: args.errorHash,
					errorMessage: args.errorMessage,
				},
			);

			console.log(
				`[processDevServerError] ${result.isNew ? "New" : "Duplicate"} error detected: ${args.errorHash}`,
			);

			// Store the error message temporarily in memory/cache for later batch analysis
			// We'll analyze all pending errors together after stream finishes
		} catch (error) {
			console.error("[Error] Failed to store error:", error);
		}
	},
});
