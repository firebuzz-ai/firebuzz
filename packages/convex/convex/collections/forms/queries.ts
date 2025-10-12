import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";

export const getById = query({
	args: {
		id: v.id("forms"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		const form = await ctx.db.get(args.id);

		if (!form) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (form.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		return await ctx.db.get(args.id);
	},
});

export const getByIdInternal = internalQuery({
	args: {
		id: v.id("forms"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const getByIdWithCampaign = query({
	args: {
		id: v.id("forms"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		const form = await ctx.db.get(args.id);
		if (!form) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (form.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const campaign = await ctx.db.get(form.campaignId);
		return { ...form, campaign };
	},
});

export const getByCampaignId = query({
	args: {
		campaignId: v.id("campaigns"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		const form = await ctx.db
			.query("forms")
			.withIndex("by_campaign_id", (q) => q.eq("campaignId", args.campaignId))
			.first(); // We only expect one form per campaign

		if (!form) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (form.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const campaign = await ctx.db.get(args.campaignId);

		return { ...form, campaign };
	},
});

export const getByCampaignIdInternal = internalQuery({
	args: {
		campaignId: v.id("campaigns"),
	},
	handler: async (ctx, args) => {
		const form = await ctx.db
			.query("forms")
			.withIndex("by_campaign_id", (q) => q.eq("campaignId", args.campaignId))
			.first();

		return form;
	},
});

// Canvas-specific query (following campaign pattern)
export const getFormCanvasData = query({
	args: {
		formId: v.id("forms"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		const form = await ctx.db.get(args.formId);
		if (!form) {
			throw new ConvexError("Form not found");
		}

		if (form.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		// Initialize canvas data if not present (return default without saving)
		if (!form.nodes || form.nodes.length === 0) {
			// Create initial empty canvas node
			const initialNode = {
				id: "form-node-main",
				type: "form",
				position: { x: 0, y: 0 },
				data: {
					title: "Form",
					schema: [], // Start with empty schema
					submitButtonText: "Submit",
					successMessage: "Thank you!",
					successRedirectUrl: "",
				},
			};

			// Return default canvas state without saving (saving will happen through mutations)
			return {
				nodes: [initialNode],
				edges: [],
				viewport: { x: 0, y: 0, zoom: 1 },
			};
		}

		return {
			nodes: form.nodes,
			edges: form.edges || [],
			viewport: form.viewport || { x: 0, y: 0, zoom: 1 },
		};
	},
});
