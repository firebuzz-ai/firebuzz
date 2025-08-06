import { CAMPAIGN_GOALS } from "@firebuzz/utils";
import {
	type EdgeChange,
	type NodeChange,
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
} from "@xyflow/react";
import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import { retrier } from "../../components/actionRetrier";
import {
	internalMutationWithTrigger,
	mutationWithTrigger,
} from "../../triggers";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";
import {
	connectionValidator,
	edgeChangeValidator,
	nodeChangeValidator,
	viewportChangeValidator,
} from "./nodeSchemas";

export const create = mutationWithTrigger({
	args: {
		title: v.string(),
		type: v.union(v.literal("lead-generation"), v.literal("click-through")),
		projectId: v.id("projects"),
		slug: v.string(),
	},
	handler: async (ctx, args) => {
		// Check if user is authenticated
		const user = await getCurrentUserWithWorkspace(ctx);

		// Check if slug is unique
		const existingSlug = await ctx.db
			.query("campaigns")
			.withIndex("by_slug_project_id", (q) =>
				q.eq("slug", args.slug).eq("projectId", args.projectId),
			)
			.unique();

		if (existingSlug) {
			throw new ConvexError("Campaign slug must be unique");
		}

		const primaryGoal = (
			args.type === "lead-generation"
				? CAMPAIGN_GOALS.find((goal) => goal.id === "form-submission")
				: CAMPAIGN_GOALS.find((goal) => goal.id === "click-through-rate")
		) as (typeof CAMPAIGN_GOALS)[number];

		// Create campaign with default canvas data in separate columns
		const campaignId = await ctx.db.insert("campaigns", {
			title: args.title,
			status: "draft",
			slug: args.slug,
			type: args.type,
			projectId: args.projectId,
			campaignSettings: {
				primaryGoal,
				customGoals: [],
				sessionDuration: 30,
				attributionPeriod: 30,
			},
			createdBy: user._id,
			workspaceId: user.currentWorkspaceId,
			isPublished: false,
			isArchived: false,
			isFinished: false,
			// Canvas data as separate columns
			nodes: [
				{
					id: "initial-traffic-node",
					type: "traffic",
					position: { x: 0, y: 0 },
					data: {
						title: "Incoming Traffic",
						description: "Start of the campaign",
						defaultVariantId: null,
					},
				},
			],
			edges: [],
			viewport: {
				x: 0,
				y: 0,
				zoom: 1,
			},
		});

		// Create form if it's lead-generation campaign
		if (args.type === "lead-generation") {
			await ctx.runMutation(
				internal.collections.forms.mutations.createInternal,
				{
					workspaceId: user.currentWorkspaceId,
					projectId: args.projectId,
					campaignId: campaignId,
					schema: [],
					createdBy: user._id,
					updatedAt: new Date().toISOString(),
				},
			);
		}

		return campaignId;
	},
});

export const deleteInternal = internalMutationWithTrigger({
	args: {
		id: v.id("campaigns"),
	},
	handler: async (ctx, { id }) => {
		try {
			const campaign = await ctx.db.get(id);

			if (!campaign) {
				throw new ConvexError("Campaign not found");
			}

			// Delete the campaign from the database
			await ctx.db.delete(id);
		} catch (error) {
			if (error instanceof ConvexError) {
				throw error;
			}
			throw new ConvexError("Failed to delete campaign");
		}
	},
});

export const archive = mutationWithTrigger({
	args: {
		id: v.id("campaigns"),
	},
	handler: async (ctx, { id }) => {
		await getCurrentUserWithWorkspace(ctx);

		await ctx.db.patch(id, {
			isArchived: true,
		});
	},
});

export const restore = mutationWithTrigger({
	args: {
		id: v.id("campaigns"),
	},
	handler: async (ctx, { id }) => {
		await getCurrentUserWithWorkspace(ctx);

		await ctx.db.patch(id, {
			isArchived: false,
		});
	},
});

export const deleteTemporary = mutationWithTrigger({
	args: {
		id: v.id("campaigns"),
	},
	handler: async (ctx, { id }) => {
		await getCurrentUserWithWorkspace(ctx);
		await ctx.db.patch(id, {
			deletedAt: new Date().toISOString(),
		});
	},
});

export const publish = mutationWithTrigger({
	args: {
		id: v.id("campaigns"),
	},
	handler: async (ctx, { id }) => {
		// Check if user is authenticated
		await getCurrentUserWithWorkspace(ctx);

		const campaign = await ctx.db.get(id);

		if (!campaign) {
			throw new ConvexError("Campaign not found");
		}

		if (!campaign.slug) {
			throw new ConvexError("Campaign must have a slug before publishing");
		}

		/*  if (!campaign.config || Object.keys(campaign.config).length === 0) {
      throw new ConvexError(
        "Campaign must have configuration before publishing"
      );
    } */

		// Validate slug length
		if (campaign.slug.length < 3) {
			throw new ConvexError("Campaign slug must be at least 3 characters long");
		}

		// Check if slug is unique (excluding the current campaign)
		const existingCampaign = await ctx.db
			.query("campaigns")
			.filter((q) => q.eq(q.field("slug"), campaign.slug))
			.filter((q) => q.neq(q.field("_id"), id))
			.first();

		if (existingCampaign) {
			throw new ConvexError("Campaign slug must be unique");
		}

		// Check if campaign has a form
		if (campaign.type === "lead-generation") {
			const form = await ctx.db
				.query("forms")
				.withIndex("by_campaign_id", (q) => q.eq("campaignId", id))
				.first();

			if (!form) {
				throw new ConvexError("Campaign must have a form before publishing");
			}

			// Publish the form
			await retrier.run(ctx, internal.collections.forms.actions.publishForm, {
				id: form._id,
			});
		}

		// Update campaign status and timestamps
		await ctx.db.patch(id, {
			status: "published",
			isPublished: true,
			publishedAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});
	},
});

export const update = mutationWithTrigger({
	args: {
		id: v.id("campaigns"),
		projectId: v.optional(v.id("projects")),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		slug: v.optional(v.string()),
		type: v.optional(
			v.union(v.literal("lead-generation"), v.literal("click-through")),
		),
		// Canvas data fields (new schema)
		nodes: v.optional(v.any()),
		edges: v.optional(v.any()),
		viewport: v.optional(v.any()),
		// Backward compatibility for migration
		config: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		// Check if user is authenticated
		const user = await getCurrentUserWithWorkspace(ctx);

		const campaign = await ctx.db.get(args.id);
		if (!campaign) {
			throw new ConvexError("Campaign not found");
		}

		if (campaign.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// If slug is being updated, validate it
		if (args.slug !== undefined) {
			// Validate slug length
			if (args.slug.length < 3) {
				throw new ConvexError(
					"Campaign slug must be at least 3 characters long",
				);
			}

			// Check if slug is unique (excluding the current campaign)
			const existingCampaign = await ctx.db
				.query("campaigns")
				.filter((q) => q.eq(q.field("slug"), args.slug))
				.filter((q) => q.neq(q.field("projectId"), args.projectId))
				.first();

			if (existingCampaign) {
				throw new ConvexError("Campaign slug must be unique");
			}
		}

		// Create update fields object
		const updateFields: Partial<Doc<"campaigns">> = {
			updatedAt: new Date().toISOString(),
			lastSaved: new Date().toISOString(),
		};

		// Add optional fields if they are defined
		if (args.title !== undefined) updateFields.title = args.title;
		if (args.description !== undefined)
			updateFields.description = args.description;
		if (args.slug !== undefined) updateFields.slug = args.slug;
		if (args.type !== undefined) updateFields.type = args.type;
		if (args.projectId !== undefined) updateFields.projectId = args.projectId;

		// Handle canvas data (new schema)
		if (args.nodes !== undefined) updateFields.nodes = args.nodes;
		if (args.edges !== undefined) updateFields.edges = args.edges;
		if (args.viewport !== undefined) updateFields.viewport = args.viewport;

		// Handle config for backward compatibility during migration
		if (args.config !== undefined) {
			// If config is provided, extract to separate columns
			updateFields.nodes = args.config.nodes;
			updateFields.edges = args.config.edges;
			updateFields.viewport = args.config.viewport;
		}

		// Update campaign with all fields
		await ctx.db.patch(args.id, updateFields);
	},
});

// Canvas-specific mutations
export const updateNodes = mutationWithTrigger({
	args: {
		campaignId: v.id("campaigns"),
		changes: v.array(nodeChangeValidator),
	},
	handler: async (ctx, args) => {
		// Check if user is authenticated
		const user = await getCurrentUserWithWorkspace(ctx);

		// Get campaign
		const campaign = await ctx.db.get(args.campaignId);

		if (!campaign) {
			throw new ConvexError("Campaign not found");
		}

		if (campaign.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		// Filter out changes to pending nodes (optimistic updates)
		const validChanges = args.changes.filter((change) => {
			if ("id" in change && change.id.startsWith("pending-")) {
				console.warn("ignoring pending node change", { change });
				return false;
			}
			return true;
		});

		// Apply changes to current nodes
		const updatedNodes = applyNodeChanges(
			validChanges as NodeChange<(typeof campaign.nodes)[number]>[],
			campaign.nodes,
		);

		// Update campaign with new nodes
		await ctx.db.patch(args.campaignId, {
			nodes: updatedNodes,
			updatedAt: new Date().toISOString(),
			lastSaved: new Date().toISOString(),
		});

		return updatedNodes;
	},
});

export const updateEdges = mutationWithTrigger({
	args: {
		campaignId: v.id("campaigns"),
		changes: v.array(edgeChangeValidator),
	},
	handler: async (ctx, args) => {
		// Check if user is authenticated
		const user = await getCurrentUserWithWorkspace(ctx);

		// Get campaign
		const campaign = await ctx.db.get(args.campaignId);

		if (!campaign) {
			throw new ConvexError("Campaign not found");
		}

		if (campaign.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		// Filter out changes to pending edges (optimistic updates)
		const validChanges = args.changes.filter((change) => {
			if ("id" in change && change.id.startsWith("pending-")) {
				console.warn("ignoring pending edge change", { change });
				return false;
			}
			return true;
		});

		// Apply changes to current edges
		const updatedEdges = applyEdgeChanges(
			validChanges as EdgeChange<(typeof campaign.edges)[number]>[],
			campaign.edges,
		);

		// Update campaign with new edges
		await ctx.db.patch(args.campaignId, {
			edges: updatedEdges,
			updatedAt: new Date().toISOString(),
			lastSaved: new Date().toISOString(),
		});

		return updatedEdges;
	},
});

export const updateViewport = mutationWithTrigger({
	args: {
		campaignId: v.id("campaigns"),
		viewport: viewportChangeValidator,
	},
	handler: async (ctx, args) => {
		// Check if user is authenticated
		const user = await getCurrentUserWithWorkspace(ctx);

		// Get campaign
		const campaign = await ctx.db.get(args.campaignId);

		if (!campaign) {
			throw new ConvexError("Campaign not found");
		}

		if (campaign.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		// Update campaign viewport
		await ctx.db.patch(args.campaignId, {
			viewport: args.viewport,
			updatedAt: new Date().toISOString(),
			lastSaved: new Date().toISOString(),
		});

		return args.viewport;
	},
});

export const connectEdge = mutationWithTrigger({
	args: {
		campaignId: v.id("campaigns"),
		connection: connectionValidator,
	},
	handler: async (ctx, args) => {
		// Check if user is authenticated
		const user = await getCurrentUserWithWorkspace(ctx);

		// Get campaign
		const campaign = await ctx.db.get(args.campaignId);

		if (!campaign) {
			throw new ConvexError("Campaign not found");
		}

		if (campaign.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		// Check for pending nodes in connection
		if (
			args.connection.source?.startsWith("pending-") ||
			args.connection.target?.startsWith("pending-")
		) {
			console.warn("ignoring pending connection", {
				connection: args.connection,
			});
			return campaign.edges;
		}

		// Add new edge to existing edges
		const edgeToAdd = {
			id: `edge-${Date.now()}`,
			...args.connection,
		};
		const updatedEdges = addEdge(edgeToAdd, campaign.edges);

		// Update campaign with new edges
		await ctx.db.patch(args.campaignId, {
			edges: updatedEdges,
			updatedAt: new Date().toISOString(),
			lastSaved: new Date().toISOString(),
		});

		return updatedEdges;
	},
});

const goalSchemaValidator = v.object({
	id: v.string(),
	title: v.string(),
	description: v.optional(v.string()),
	direction: v.union(v.literal("up"), v.literal("down")),
	placement: v.union(v.literal("internal"), v.literal("external")),
	value: v.number(),
	currency: v.optional(v.string()),
	type: v.union(v.literal("conversion"), v.literal("engagement")),
	isCustom: v.boolean(),
});

export const updateCampaignSettings = mutationWithTrigger({
	args: {
		campaignId: v.id("campaigns"),
		campaignSettings: v.object({
			primaryGoal: v.optional(goalSchemaValidator),
			customGoals: v.optional(v.array(goalSchemaValidator)),
			sessionDuration: v.optional(v.number()),
			attributionPeriod: v.optional(v.number()),
		}),
	},
	handler: async (ctx, args) => {
		// Check if user is authenticated
		const user = await getCurrentUserWithWorkspace(ctx);

		// Get campaign
		const campaign = await ctx.db.get(args.campaignId);

		if (!campaign) {
			throw new ConvexError("Campaign not found");
		}

		if (campaign.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		// Validate session duration (5-30 minutes)
		if (args.campaignSettings.sessionDuration !== undefined) {
			if (
				args.campaignSettings.sessionDuration < 5 ||
				args.campaignSettings.sessionDuration > 30
			) {
				throw new ConvexError(
					"Session duration must be between 5 and 30 minutes",
				);
			}
		}

		// Validate attribution period (1-30 days)
		if (args.campaignSettings.attributionPeriod !== undefined) {
			if (
				args.campaignSettings.attributionPeriod < 1 ||
				args.campaignSettings.attributionPeriod > 30
			) {
				throw new ConvexError(
					"Attribution period must be between 1 and 30 days",
				);
			}
		}

		// Merge with existing campaign settings
		const updatedSettings = {
			...campaign.campaignSettings,
			...args.campaignSettings,
		};

		// Update campaign with new settings
		await ctx.db.patch(args.campaignId, {
			campaignSettings: updatedSettings,
			updatedAt: new Date().toISOString(),
			lastSaved: new Date().toISOString(),
		});

		return updatedSettings;
	},
});
