import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import {
  aggregateCampaigns,
  aggregateLandingPageVersions,
  aggregateLandingPages,
} from "../aggregates";

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
