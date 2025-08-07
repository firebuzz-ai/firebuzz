import { defineTable } from "convex/server";
import { v } from "convex/values";

// Form field schema definition
export const formFieldSchema = v.object({
	id: v.string(),
	title: v.string(),
	placeholder: v.optional(v.string()),
	description: v.optional(v.string()),
	type: v.union(v.literal("string"), v.literal("number"), v.literal("boolean")),
	inputType: v.union(
		v.literal("text"),
		v.literal("number"),
		v.literal("checkbox"),
		v.literal("radio"),
		v.literal("select"),
		v.literal("textarea"),
		v.literal("date"),
		v.literal("time"),
		v.literal("email"),
		v.literal("url"),
		v.literal("tel"),
		v.literal("password"),
	),
	// Flags
	required: v.boolean(),
	unique: v.boolean(),
	visible: v.boolean(),
	default: v.optional(v.union(v.string(), v.number(), v.boolean())),
	options: v.optional(
		v.array(
			v.object({
				label: v.string(),
				value: v.string(),
			}),
		),
	),
});

// Form node data schema for canvas
export const formNodeDataSchema = v.object({
	title: v.string(),
	description: v.optional(v.string()),
	schema: v.array(formFieldSchema),
	submitButtonText: v.string(),
	successMessage: v.string(),
	successRedirectUrl: v.optional(v.string()),
});

export const nodeSchema = v.object({
	id: v.string(),
	type: v.optional(v.string()),
	position: v.object({
		x: v.number(),
		y: v.number(),
	}),
	dragging: v.optional(v.boolean()),
	selected: v.optional(v.boolean()),
	hidden: v.optional(v.boolean()),
	parentId: v.optional(v.string()),
	measured: v.optional(
		v.object({
			width: v.optional(v.number()),
			height: v.optional(v.number()),
		}),
	),
	data: formNodeDataSchema,
	dragHandle: v.optional(v.string()),
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	initialWidth: v.optional(v.number()),
	initialHeight: v.optional(v.number()),
	zIndex: v.optional(v.number()),
	handles: v.optional(v.array(v.any())),
});

export const formEdgeSchema = v.object({
	id: v.string(),
	source: v.string(),
	target: v.string(),
	sourceHandle: v.optional(v.string()),
	targetHandle: v.optional(v.string()),
	type: v.optional(v.string()),
	animated: v.optional(v.boolean()),
	hidden: v.optional(v.boolean()),
	selected: v.optional(v.boolean()),
	data: v.optional(v.any()),
});

export const formViewportSchema = v.object({
	x: v.number(),
	y: v.number(),
	zoom: v.number(),
});

// Form-specific node change validator (following campaign pattern)
export const formNodeChangeValidator = v.any();

export const formViewportChangeValidator = formViewportSchema;

export const formSchema = defineTable(
	v.object({
		// Canvas fields (single source of truth)
		nodes: v.optional(v.array(nodeSchema)),
		edges: v.optional(v.array(formEdgeSchema)),
		viewport: v.optional(formViewportSchema),

		// Relations
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		campaignId: v.id("campaigns"),
		createdBy: v.id("users"),
		// Timestamps
		updatedAt: v.string(),
		lastSaved: v.optional(v.string()),
	}),
)
	.index("by_workspace_id", ["workspaceId"])
	.index("by_project_id", ["projectId"])
	.index("by_campaign_id", ["campaignId"]);
