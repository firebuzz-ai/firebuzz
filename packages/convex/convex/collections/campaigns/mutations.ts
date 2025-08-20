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
import type { Doc, Id } from "../../_generated/dataModel";
import { retrier } from "../../components/actionRetrier";
import {
	internalMutationWithTrigger,
	mutationWithTrigger,
} from "../../triggers";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";
import { extractLandingPageIdsFromNodes } from "./helpers/getLandingPagesFromConfig";
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
		primaryLanguage: v.string(),
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
			primaryLanguage: args.primaryLanguage,
			campaignSettings: {
				primaryGoal,
				customGoals: [],
				sessionDurationInMinutes: 30,
				attributionPeriodInDays: 30,
			},
			createdBy: user._id,
			workspaceId: user.currentWorkspaceId,
			isPublished: false,
			isArchived: false,
			isCompleted: false,
			// Canvas data as separate columns
			nodes: [
				{
					id: "initial-traffic-node",
					type: "traffic",
					position: { x: 0, y: 0 },
					data: {
						title: "Incoming Traffic",
						description: "Start of the campaign",
						defaultLandingPageId: undefined,
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
					createdBy: user._id,
					updatedAt: new Date().toISOString(),
					nodes: [
						{
							data: {
								schema: [],
								submitButtonText: "Submit",
								successMessage: "Thank you for your submission!",
								successRedirectUrl: "",
								title: "Form",
							},
							dragging: false,
							id: "form-node-main",
							position: { x: 0, y: 0 },
							selected: false,
							type: "form",
						},
					],
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
		type: v.union(v.literal("preview"), v.literal("production")),
		domainIds: v.optional(v.array(v.id("customDomains"))),
	},
	handler: async (ctx, { id, type, domainIds }) => {
		// Check if user is authenticated
		const user = await getCurrentUserWithWorkspace(ctx);

		const campaign = await ctx.db.get(id);

		if (!campaign) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (campaign.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		if (!campaign.slug) {
			throw new ConvexError("Campaign must have a slug before publishing");
		}

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

			await retrier.run(
				ctx,
				internal.collections.forms.actions.storeFormConfigInKV,
				{
					id: form._id,
					type,
				},
			);
		}

		// Publish campaign config to KV
		await retrier.run(
			ctx,
			internal.collections.campaigns.actions.storeCampaignConfigInKV,
			{
				campaignId: id,
				type,
				domainIds,
			},
		);

		// Update campaign based on type
		if (type === "preview") {
			// Generate preview URL
			const previewUrl = `${process.env.PREVIEW_URL}/campaign/${id}`;

			// If campaign is already published, just update preview URL without changing status
			if (campaign.status === "published") {
				await ctx.db.patch(id, {
					previewPublishedAt: new Date().toISOString(),
					urlConfig: {
						...campaign.urlConfig,
						previewUrl,
					},
					updatedAt: new Date().toISOString(),
				});
			} else {
				// For draft campaigns, set status to preview
				await ctx.db.patch(id, {
					status: "preview",
					previewPublishedAt: new Date().toISOString(),
					urlConfig: {
						previewUrl,
					},
					updatedAt: new Date().toISOString(),
				});
			}
		} else if (type === "production") {
			// Must be in preview status first, or already published for republishing
			if (["draft", "completed"].includes(campaign.status)) {
				throw new ConvexError("Can't publish campaign in this status");
			}

			// Get project domain for URL generation
			const projectDomains = await ctx.db
				.query("projectDomains")
				.withIndex("by_project_id", (q) =>
					q.eq("projectId", campaign.projectId),
				)
				.filter((q) => q.eq(q.field("deletedAt"), undefined))
				.filter((q) => q.neq(q.field("isArchived"), true))
				.collect();

			if (!projectDomains || projectDomains.length === 0) {
				throw new ConvexError("Project domain not found");
			}

			const projectDomain = projectDomains[0]!;

			// Generate production URLs
			const productionUrls = [];

			// Always add project domain URL
			const projectUrl = `${projectDomain.subdomain}.${projectDomain.domain}/${campaign.slug}`;
			productionUrls.push({
				type: "workspace" as const,
				url: projectUrl,
			});

			// Add custom domain URLs if specified
			if (domainIds && domainIds.length > 0) {
				for (const domainId of domainIds) {
					const domain = await ctx.db.get(domainId);
					if (domain && domain.status === "active") {
						productionUrls.push({
							type: "custom" as const,
							url: `${domain.hostname}/${campaign.slug}`,
							domainId,
						});
					}
				}
			}

			// Get all landing pages from campaign config and store them in production
			const landingPageIds = extractLandingPageIdsFromNodes(campaign.nodes);

			if (landingPageIds.length > 0) {
				// Store each landing page in production using retrier
				await Promise.all(
					landingPageIds.map((landingPageId) =>
						retrier.run(
							ctx,
							internal.collections.landingPages.actions.storeInKVForProduction,
							{
								landingPageId: landingPageId as Id<"landingPages">,
							},
						),
					),
				);
			}

			// Sync AB tests
			await retrier.run(
				ctx,
				internal.collections.campaigns.actions.syncABTest,
				{ campaignId: id },
			);

			await ctx.db.patch(id, {
				status: "published",
				isPublished: true,
				publishedAt: new Date().toISOString(),
				urlConfig: {
					previewUrl:
						campaign.urlConfig?.previewUrl ||
						`${process.env.PREVIEW_URL}/campaign/${id}`,
					productionUrls,
				},
				updatedAt: new Date().toISOString(),
			});
		}
	},
});

export const publishInternal = internalMutationWithTrigger({
	args: {
		id: v.id("campaigns"),
		type: v.union(v.literal("preview"), v.literal("production")),
		domainIds: v.optional(v.array(v.id("customDomains"))),
	},
	handler: async (ctx, { id, type, domainIds }) => {
		// Check if user is authenticated
		const user = await getCurrentUserWithWorkspace(ctx);

		const campaign = await ctx.db.get(id);

		if (!campaign) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (campaign.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		if (!campaign.slug) {
			throw new ConvexError("Campaign must have a slug before publishing");
		}

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

			await retrier.run(
				ctx,
				internal.collections.forms.actions.storeFormConfigInKV,
				{
					id: form._id,
					type,
				},
			);
		}

		// Publish campaign config to KV
		await retrier.run(
			ctx,
			internal.collections.campaigns.actions.storeCampaignConfigInKV,
			{
				campaignId: id,
				type,
				domainIds,
			},
		);

		// Update campaign based on type
		if (type === "preview") {
			// Generate preview URL
			const previewUrl = `${process.env.PREVIEW_URL}/campaign/${id}`;

			// If campaign is already published, just update preview URL without changing status
			if (campaign.status === "published") {
				await ctx.db.patch(id, {
					previewPublishedAt: new Date().toISOString(),
					urlConfig: {
						...campaign.urlConfig,
						previewUrl,
					},
					updatedAt: new Date().toISOString(),
				});
			} else {
				// For draft campaigns, set status to preview
				await ctx.db.patch(id, {
					status: "preview",
					previewPublishedAt: new Date().toISOString(),
					urlConfig: {
						previewUrl,
					},
					updatedAt: new Date().toISOString(),
				});
			}
		} else if (type === "production") {
			// Must be in preview status first, or already published for republishing
			if (["draft", "completed"].includes(campaign.status)) {
				throw new ConvexError("Can't publish campaign in this status");
			}

			// Get project domain for URL generation
			const projectDomains = await ctx.db
				.query("projectDomains")
				.withIndex("by_project_id", (q) =>
					q.eq("projectId", campaign.projectId),
				)
				.filter((q) => q.eq(q.field("deletedAt"), undefined))
				.filter((q) => q.neq(q.field("isArchived"), true))
				.collect();

			if (!projectDomains || projectDomains.length === 0) {
				throw new ConvexError("Project domain not found");
			}

			const projectDomain = projectDomains[0]!;

			// Generate production URLs
			const productionUrls = [];

			// Always add project domain URL
			const projectUrl = `${projectDomain.subdomain}.${projectDomain.domain}/${campaign.slug}`;
			productionUrls.push({
				type: "workspace" as const,
				url: projectUrl,
			});

			// Add custom domain URLs if specified
			if (domainIds && domainIds.length > 0) {
				for (const domainId of domainIds) {
					const domain = await ctx.db.get(domainId);
					if (domain && domain.status === "active") {
						productionUrls.push({
							type: "custom" as const,
							url: `${domain.hostname}/${campaign.slug}`,
							domainId,
						});
					}
				}
			}

			// Get all landing pages from campaign config and store them in production
			const landingPageIds = extractLandingPageIdsFromNodes(campaign.nodes);

			if (landingPageIds.length > 0) {
				// Store each landing page in production using retrier
				await Promise.all(
					landingPageIds.map((landingPageId) =>
						retrier.run(
							ctx,
							internal.collections.landingPages.actions.storeInKVForProduction,
							{
								landingPageId: landingPageId as Id<"landingPages">,
							},
						),
					),
				);
			}

			await ctx.db.patch(id, {
				status: "published",
				isPublished: true,
				publishedAt: new Date().toISOString(),
				urlConfig: {
					previewUrl:
						campaign.urlConfig?.previewUrl ||
						`${process.env.PREVIEW_URL}/campaign/${id}`,
					productionUrls,
				},
				updatedAt: new Date().toISOString(),
			});
		}
	},
});

export const schedulePublish = mutationWithTrigger({
	args: {
		id: v.id("campaigns"),
		scheduledAt: v.string(), // ISO date string
		domainIds: v.optional(v.array(v.id("customDomains"))),
	},
	handler: async (ctx, { id, scheduledAt, domainIds }) => {
		// Check if user is authenticated
		const user = await getCurrentUserWithWorkspace(ctx);

		const campaign = await ctx.db.get(id);

		if (!campaign) {
			throw new ConvexError("Campaign not found");
		}

		if (campaign.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Must be in preview status first
		if (campaign.status !== "preview") {
			throw new ConvexError("Campaign must be published to preview first");
		}

		// Validate future date (at least 5 minutes from now)
		const scheduledDate = new Date(scheduledAt);
		const now = new Date();
		const minScheduleTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

		if (scheduledDate <= minScheduleTime) {
			throw new ConvexError(
				"Scheduled date must be at least 5 minutes in the future",
			);
		}

		// Cancel any existing schedule
		if (campaign.scheduledId) {
			await ctx.scheduler.cancel(campaign.scheduledId);
		}

		// Create scheduled function
		const scheduledId = await ctx.scheduler.runAt(
			scheduledDate,
			internal.collections.campaigns.mutations.publishInternal,
			{ id, domainIds, type: "production" },
		);

		// Update campaign status and schedule info
		await ctx.db.patch(id, {
			status: "scheduled",
			scheduledAt,
			scheduledId,
			updatedAt: new Date().toISOString(),
		});
	},
});

export const reschedulePublish = mutationWithTrigger({
	args: {
		id: v.id("campaigns"),
		newScheduledAt: v.string(),
		domainIds: v.optional(v.array(v.id("customDomains"))),
	},
	handler: async (ctx, { id, newScheduledAt, domainIds }) => {
		// Check if user is authenticated
		await getCurrentUserWithWorkspace(ctx);

		const campaign = await ctx.db.get(id);

		if (!campaign) {
			throw new ConvexError("Campaign not found");
		}

		if (campaign.status !== "scheduled") {
			throw new ConvexError("Campaign is not currently scheduled");
		}

		// Validate future date (at least 5 minutes from now)
		const newScheduledDate = new Date(newScheduledAt);
		const now = new Date();
		const minScheduleTime = new Date(now.getTime() + 5 * 60 * 1000);

		if (newScheduledDate <= minScheduleTime) {
			throw new ConvexError(
				"Scheduled date must be at least 5 minutes in the future",
			);
		}

		// Cancel existing scheduled function
		if (campaign.scheduledId) {
			await ctx.scheduler.cancel(campaign.scheduledId);
		}

		// Create new scheduled function
		const scheduledId = await ctx.scheduler.runAt(
			newScheduledDate,
			internal.collections.campaigns.mutations.publishInternal,
			{ id, domainIds, type: "production" },
		);

		// Update campaign with new schedule info
		await ctx.db.patch(id, {
			scheduledAt: newScheduledAt,
			scheduledId,
			updatedAt: new Date().toISOString(),
		});
	},
});

export const cancelSchedule = mutationWithTrigger({
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

		if (campaign.status !== "scheduled") {
			throw new ConvexError("Campaign is not currently scheduled");
		}

		// Cancel scheduled function
		if (campaign.scheduledId) {
			await ctx.scheduler.cancel(campaign.scheduledId);
		}

		// Update campaign back to preview status
		await ctx.db.patch(id, {
			status: "preview",
			scheduledAt: undefined,
			scheduledId: undefined,
			updatedAt: new Date().toISOString(),
		});
	},
});

export const markAsCompleted = mutationWithTrigger({
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

		if (campaign.status !== "published") {
			throw new ConvexError("Campaign must be published to mark as completed");
		}

		// Update campaign to completed status
		await ctx.db.patch(id, {
			status: "completed",
			isCompleted: true,
			completedAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});
	},
});

export const reactivateCampaign = mutationWithTrigger({
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

		if (campaign.status !== "completed") {
			throw new ConvexError("Campaign is not completed");
		}

		// Reactivate campaign back to published status
		await ctx.db.patch(id, {
			status: "published",
			isCompleted: false,
			completedAt: undefined,
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
		primaryLanguage: v.optional(v.string()),
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
			lastUpdatedBy: user._id,
		};

		// Add optional fields if they are defined
		if (args.title !== undefined) updateFields.title = args.title;
		if (args.description !== undefined)
			updateFields.description = args.description;
		if (args.slug !== undefined) updateFields.slug = args.slug;
		if (args.type !== undefined) updateFields.type = args.type;
		if (args.projectId !== undefined) updateFields.projectId = args.projectId;
		if (args.primaryLanguage !== undefined)
			updateFields.primaryLanguage = args.primaryLanguage;

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
			sessionDurationInMinutes: v.optional(v.number()),
			attributionPeriodInDays: v.optional(v.number()),
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
		if (args.campaignSettings.sessionDurationInMinutes !== undefined) {
			if (
				args.campaignSettings.sessionDurationInMinutes < 5 ||
				args.campaignSettings.sessionDurationInMinutes > 30
			) {
				throw new ConvexError(
					"Session duration must be between 5 and 30 minutes",
				);
			}
		}

		// Validate attribution period (1-30 days)
		if (args.campaignSettings.attributionPeriodInDays !== undefined) {
			if (
				args.campaignSettings.attributionPeriodInDays < 1 ||
				args.campaignSettings.attributionPeriodInDays > 30
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
		});

		return updatedSettings;
	},
});
