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
