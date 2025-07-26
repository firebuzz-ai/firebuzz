import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import { retrier } from "../../components/actionRetrier";
import {
	internalMutationWithTrigger,
	mutationWithTrigger,
} from "../../triggers";
import { getCurrentUserWithWorkspace } from "../users/utils";
import { edgeSchema, nodeSchema } from "./schema";

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
		const initialNode = {
			id: "initial-traffic-node",
			type: "traffic",
			position: { x: 0, y: 0 },
			data: {
				title: "Incoming Traffic",
				description: "Start of the campaign",
				defaultVariantId: null,
				validations: [{ isValid: false, message: "No variant selected" }],
			},
		};

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

		// Create campaign
		const campaignId = await ctx.db.insert("campaigns", {
			title: args.title,
			status: "draft",
			slug: args.slug,
			type: args.type,
			projectId: args.projectId,
			createdBy: user._id,
			workspaceId: user.currentWorkspaceId,
			isPublished: false,
			isArchived: false,
			isFinished: false,
			nodes: [initialNode],
			edges: [],
			config: {},
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
		projectId: v.id("projects"),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		slug: v.optional(v.string()),
		type: v.optional(
			v.union(v.literal("lead-generation"), v.literal("click-through")),
		),
		config: v.optional(v.record(v.string(), v.any())),
		nodes: v.optional(v.array(nodeSchema)),
		edges: v.optional(v.array(edgeSchema)),
	},
	handler: async (ctx, args) => {
		// Check if user is authenticated
		await getCurrentUserWithWorkspace(ctx);

		const campaign = await ctx.db.get(args.id);
		if (!campaign) {
			throw new ConvexError("Campaign not found");
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
		};

		// Add optional fields if they are defined
		if (args.title !== undefined) updateFields.title = args.title;
		if (args.description !== undefined)
			updateFields.description = args.description;
		if (args.slug !== undefined) updateFields.slug = args.slug;
		if (args.type !== undefined) updateFields.type = args.type;
		if (args.config !== undefined) updateFields.config = args.config;
		if (args.nodes !== undefined) updateFields.nodes = args.nodes;
		if (args.edges !== undefined) updateFields.edges = args.edges;
		// Update campaign
		await ctx.db.patch(args.id, updateFields);
	},
});
