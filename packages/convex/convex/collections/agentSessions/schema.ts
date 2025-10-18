import { defineTable } from "convex/server";
import { v } from "convex/values";
import { modelSchema } from "../../ai/models/schema";

// Attachment schema for agent session (moved up for use in queueSchema)
const attachmentSchema = v.union(
	v.object({
		type: v.literal("media"),
		id: v.id("media"),
	}),
	v.object({
		type: v.literal("document"),
		id: v.id("documents"),
	}),
);

// Message queue schema for agent
const queueSchema = v.object({
	id: v.string(), // Unique identifier (nanoid from client)
	prompt: v.string(),
	createdAt: v.string(),
	createdBy: v.id("users"),
	updatedBy: v.optional(v.id("users")),
	order: v.number(),
	attachments: v.array(attachmentSchema), // Attachments for this queued message
});

// Todo list schema for agent
const todoListSchema = v.object({
	id: v.string(),
	title: v.string(),
	description: v.string(),
	status: v.union(
		v.literal("todo"),
		v.literal("in-progress"),
		v.literal("completed"),
		v.literal("cancelled"),
		v.literal("failed"),
	),
	createdAt: v.string(),
	order: v.number(),
});

// Dev server error schema for auto-fixing
const errorSchema = v.object({
	errorHash: v.string(), // MD5/SHA hash for deduplication
	errorMessage: v.string(), // Full error message (temporary, removed after applied)
	detectedAt: v.string(), // ISO timestamp
	isAutoFixEnabled: v.boolean(), // Snapshot of autoErrorFix flag when detected
});

// Base schema for agent session
const baseSchema = v.object({
	// Relations
	workspaceId: v.id("workspaces"),
	projectId: v.id("projects"),
	campaignId: v.id("campaigns"),
	createdBy: v.id("users"),
	sandboxId: v.optional(v.id("sandboxes")), // New
	// Timestamps
	startedAt: v.string(),
	updatedAt: v.optional(v.string()),
	endedAt: v.optional(v.string()),
	pausedAt: v.optional(v.string()),
	maxDuration: v.number(), // in milliseconds
	maxIdleTime: v.number(), // in milliseconds
	shutdownAt: v.optional(v.string()),
	scheduledId: v.optional(v.id("_scheduled_functions")),
	shutdownReason: v.optional(
		v.union(
			v.literal("idle"),
			v.literal("max-duration"),
			v.literal("sandbox-closed"),
		),
	),
	status: v.union(v.literal("active"), v.literal("completed")),
	knowledgeBases: v.optional(v.array(v.id("knowledgeBases"))),
	model: modelSchema,
	messageQueue: v.array(queueSchema),
	todoList: v.array(todoListSchema),
	devServerErrors: v.array(errorSchema),
	autoErrorFix: v.boolean(),
	joinedUsers: v.array(v.id("users")),
	sessionType: v.union(v.literal("background"), v.literal("regular")),
	attachments: v.array(attachmentSchema),
});

export const landingPageSessionSchema = v.object({
	...baseSchema.fields,
	assetType: v.literal("landingPage"),
	landingPageId: v.id("landingPages"),
});

const formSessionSchema = v.object({
	...baseSchema.fields,
	assetType: v.literal("form"),
	formId: v.id("forms"),
});

export const agentSessionSchema = defineTable(
	v.union(landingPageSessionSchema, formSessionSchema),
)
	.index("by_workspace_id", ["workspaceId"])
	.index("by_project_id", ["projectId"])
	.index("by_campaign_id", ["campaignId"])
	.index("by_landing_page_id", ["landingPageId"])
	.index("by_form_id", ["formId"]);
