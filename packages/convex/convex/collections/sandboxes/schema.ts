import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sandboxConfigSchema = v.object({
	vcpus: v.union(v.literal(1), v.literal(2), v.literal(4), v.literal(8)),
	runtime: v.literal("node22"),
	timeout: v.number(),
	cwd: v.literal("/vercel/sandbox"),
	ports: v.array(v.number()),
});

export const sandboxSchema = defineTable(
	v.object({
		sandboxExternalId: v.string(),
		status: v.union(
			v.literal("pending"),
			v.literal("running"),
			v.literal("stopping"),
			v.literal("stopped"),
			v.literal("failed"),
		),
		// Config
		...sandboxConfigSchema.fields,
		// Commands
		installCmdId: v.optional(v.id("sandboxCommands")),
		devCmdId: v.optional(v.id("sandboxCommands")),
		buildCmdId: v.optional(v.id("sandboxCommands")),
		// Build Status
		isBuilding: v.optional(v.boolean()),
		// Preview URL
		previewUrl: v.optional(v.string()),
		// Timestamps / Duration
		startedAt: v.optional(v.string()),
		stoppedAt: v.optional(v.string()),
		duration: v.optional(v.number()),
		// Relations
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		campaignId: v.id("campaigns"),
		agentSessionId: v.id("agentSessions"),
		createdBy: v.id("users"),
	}),
)
	.index("by_status", ["status"])
	.index("by_workspace_id", ["workspaceId"])
	.index("by_agent_session_id", ["agentSessionId"])
	.index("by_sandbox_external_id", ["sandboxExternalId"]);
