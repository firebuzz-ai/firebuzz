import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sandboxCommandSchema = defineTable(
	v.object({
		// Command identification
		cmdId: v.string(), // Vercel command ID
		sandboxId: v.id("sandboxes"),

		// Command details
		command: v.string(), // e.g., "pnpm"
		args: v.array(v.string()), // e.g., ["install", "--loglevel", "info"]
		cwd: v.string(),

		// Command type for easy filtering
		type: v.union(
			v.literal("install"),
			v.literal("dev"),
			v.literal("build"),
			v.literal("typecheck"),
			v.literal("other"),
		),

		// Status tracking
		status: v.union(
			v.literal("pending"),
			v.literal("running"),
			v.literal("completed"),
			v.literal("failed"),
			v.literal("error"),
		),

		// Results
		exitCode: v.optional(v.number()),
		// Array of log lines
		logs: v.array(
			v.object({
				stream: v.union(v.literal("stdout"), v.literal("stderr")),
				data: v.string(),
				timestamp: v.string(),
			}),
		),

		// Timestamps
		startedAt: v.string(),
		completedAt: v.optional(v.string()),
		duration: v.optional(v.number()), // milliseconds

		// Relations
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		campaignId: v.id("campaigns"),
		agentSessionId: v.id("agentSessions"),
		createdBy: v.id("users"),
	}),
)
	.index("by_sandbox_id", ["sandboxId"])
	.index("by_agent_session_id", ["agentSessionId"])
	.index("by_cmd_id", ["cmdId"])
	.index("by_type_and_sandbox", ["type", "sandboxId"])
	.index("by_status", ["status"]);
