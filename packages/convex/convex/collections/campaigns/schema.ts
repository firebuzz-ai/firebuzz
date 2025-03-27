import { v } from "convex/values";

export const nodeSchema = v.object({
	id: v.string(),
	type: v.optional(v.string()),
	position: v.object({
		x: v.number(),
		y: v.number(),
	}),
	dragging: v.optional(v.boolean()),
	selected: v.optional(v.boolean()),
	parentId: v.optional(v.string()),
	measured: v.optional(
		v.object({
			width: v.optional(v.number()),
			height: v.optional(v.number()),
		}),
	),
	data: v.record(v.string(), v.any()),
	dragHandle: v.optional(v.string()),
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	initialWidth: v.optional(v.number()),
	initialHeight: v.optional(v.number()),
	zIndex: v.optional(v.number()),
	handles: v.optional(v.array(v.any())),
});

export const edgeSchema = v.object({
	id: v.string(),
	source: v.string(),
	target: v.string(),
	type: v.optional(v.string()),
	animated: v.optional(v.boolean()),
	selected: v.optional(v.boolean()),
	data: v.optional(v.any()),
});

export const campaignSchema = v.object({
	title: v.string(),
	description: v.optional(v.string()),
	slug: v.optional(v.string()),
	type: v.union(v.literal("lead-generation"), v.literal("click-through")),
	status: v.union(
		v.literal("draft"),
		v.literal("published"),
		v.literal("cancelled"),
	),
	config: v.record(v.string(), v.any()),
	nodes: v.array(nodeSchema),
	edges: v.array(edgeSchema),
	updatedAt: v.optional(v.string()),
	startedAt: v.optional(v.string()),
	finishedAt: v.optional(v.string()),
	publishedAt: v.optional(v.string()),
	deletedAt: v.optional(v.string()),
	isPublished: v.boolean(),
	isArchived: v.boolean(),
	workspaceId: v.id("workspaces"),
	projectId: v.id("projects"),
	createdBy: v.id("users"),
});

export type CampaignType = "lead-generation" | "click-through";
export type CampaignStatus = "draft" | "published" | "cancelled";
