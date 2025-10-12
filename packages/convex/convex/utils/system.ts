import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import {
	aggregateCampaigns,
	aggregateCreditsBalance,
	aggregateCurrentPeriodAdditions,
	aggregateCurrentPeriodUsage,
	aggregateDocuments,
	aggregateLandingPages,
	aggregateLandingPageVersions,
	aggregateMedia,
} from "../components/aggregates";
import { batchDeleteStoragePool, cascadePool } from "../components/workpools";

export const cleanCreditsBalanceAggregates = internalMutation({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, args) => {
		return await aggregateCreditsBalance.clear(ctx, {
			namespace: args.workspaceId,
		});
	},
});

export const cleanCurrentPeriodUsageAggregates = internalMutation({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, args) => {
		return await aggregateCurrentPeriodUsage.clear(ctx, {
			namespace: args.workspaceId,
		});
	},
});

export const cleanCurrentPeriodAdditionsAggregates = internalMutation({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, args) => {
		return await aggregateCurrentPeriodAdditions.clear(ctx, {
			namespace: args.workspaceId,
		});
	},
});

export const cleanCampaignAggregates = internalMutation({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		return await aggregateCampaigns.clear(ctx, {
			namespace: args.projectId,
		});
	},
});

export const cleanLandingPageAggregates = internalMutation({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		return await aggregateLandingPages.clear(ctx, {
			namespace: args.projectId,
		});
	},
});

export const cleanLandingPageVersionAggregates = internalMutation({
	args: { landingPageId: v.id("landingPages") },
	handler: async (ctx, args) => {
		return await aggregateLandingPageVersions.clear(ctx, {
			namespace: args.landingPageId,
		});
	},
});

export const cleanMediaAggregates = internalMutation({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		return await aggregateMedia.clear(ctx, {
			namespace: args.projectId,
		});
	},
});

export const cleanDocumentAggregates = internalMutation({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		return await aggregateDocuments.clear(ctx, {
			namespace: args.projectId,
		});
	},
});

export const cancelAllCascadeWork = internalMutation({
	args: {},
	handler: async (ctx) => {
		return await cascadePool.cancelAll(ctx);
	},
});

export const cancelAllBatchDeleteStorageWork = internalMutation({
	args: {},
	handler: async (ctx) => {
		return await batchDeleteStoragePool.cancelAll(ctx);
	},
});
