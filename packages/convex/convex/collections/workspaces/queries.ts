import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { getCurrentUser } from "../users/utils";
import { getWorkspaceByExternalId, getWorkspaceById } from "./utils";

export const getPersonal = query({
  handler: async (ctx) => {
    // Check if user is authenticated
    const user = await getCurrentUser(ctx);
    const workspace = await getWorkspaceByExternalId(ctx, user.externalId);

    return workspace;
  },
});

export const getCurrent = query({
  handler: async (ctx) => {
    // Check if user is authenticated
    const user = await getCurrentUser(ctx);
    const workspace = await getWorkspaceById(ctx, user.currentWorkspaceId);

    return workspace;
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
      return await getWorkspaceByExternalId(ctx, externalId);
    });

    // Get personal workspace
    const personalWorkspace = await getWorkspaceByExternalId(
      ctx,
      user.externalId
    );

    // Return all workspaces
    return workspaces
      .filter((workspace) => workspace !== null)
      .concat(personalWorkspace ? [personalWorkspace] : []);
  },
});

export const checkPersonalSpace = internalQuery({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    if (!externalId) {
      return false;
    }

    const personalSpace = await getWorkspaceByExternalId(ctx, externalId);
    return personalSpace === null;
  },
});
