import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { getCurrentUser } from "../users/utils";
import {
  getPersonalWorkspacesByOwnerId,
  getTeamWorkspaceByExternalId,
} from "./utils";

export const getCurrent = query({
  handler: async (ctx) => {
    // Check if user is authenticated
    const user = await getCurrentUser(ctx);

    if (!user.currentWorkspaceId) {
      return null;
    }

    const workspace = await ctx.db.get(user.currentWorkspaceId);

    if (!workspace) {
      return null;
    }

    const owner = await ctx.db.get(workspace.ownerId);

    return {
      ...workspace,
      owner,
    };
  },
});

export const getAll = query({
  args: {
    externalIds: v.array(v.string()),
  },
  handler: async (ctx, { externalIds }) => {
    // Check if user is authenticated
    const user = await getCurrentUser(ctx);

    // Get all team workspaces
    const workspaces = await asyncMap(externalIds, async (externalId) => {
      return await getTeamWorkspaceByExternalId(ctx, externalId);
    });

    // Get personal workspaces
    const personalWorkspaces = await getPersonalWorkspacesByOwnerId(
      ctx,
      user._id
    );

    // Return all workspaces
    return workspaces
      .filter((workspace) => workspace !== null)
      .concat(personalWorkspaces);
  },
});

export const getByIdInternal = internalQuery({
  args: { id: v.id("workspaces") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getByStripeCustomerId = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    return await ctx.db
      .query("workspaces")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("customerId", stripeCustomerId)
      )
      .first();
  },
});

export const checkIsPersonalWorkspaceAvailable = internalQuery({
  args: { ownerId: v.id("users") },
  handler: async (ctx, { ownerId }) => {
    const personalWorkspaces = await getPersonalWorkspacesByOwnerId(
      ctx,
      ownerId
    );

    return personalWorkspaces.length < 2;
  },
});
