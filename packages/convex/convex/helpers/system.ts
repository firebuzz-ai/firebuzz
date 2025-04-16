import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import {
  aggregateCampaigns,
  aggregateLandingPageVersions,
  aggregateLandingPages,
} from "../aggregates";
import { batchDeleteStoragePool, cascadePool } from "../workpools";

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
