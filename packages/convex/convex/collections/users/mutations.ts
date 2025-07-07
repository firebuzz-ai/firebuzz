import type { UserJSON } from "@clerk/backend";
import { ConvexError, type Validator, v } from "convex/values";
import { internalMutation, mutation } from "../../_generated/server";
import { internalMutationWithTrigger } from "../../triggers";
import { ERRORS } from "../../utils/errors";
import { getTeamWorkspaceByExternalId } from "../workspaces/utils";
import { getCurrentUser, getUserByExternalId } from "./utils";

export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
  async handler(ctx, { data }) {
    const userAttributes = {
      firstName: data.first_name ?? undefined,
      lastName: data.last_name ?? undefined,
      fullName: `${data.first_name} ${data.last_name}`,
      imageUrl: data.image_url ?? undefined,
      email: data.email_addresses[0].email_address,
      externalId: data.id,
    };

    // Check if the user already exists
    const user = await getUserByExternalId(ctx, data.id);
    if (user === null) {
      // If the user does not exist, create a new user
      await ctx.db.insert("users", userAttributes);
    } else {
      // If the user exists, update the user
      await ctx.db.patch(user._id, userAttributes);
    }
  },
});

export const deleteUserWithAllDataByExternalId = internalMutationWithTrigger({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const user = await getUserByExternalId(ctx, externalId);
    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});

export const updateCurrentProject = mutation({
  args: {
    currentProjectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, { currentProjectId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    // Get the project
    if (currentProjectId) {
      const project = await ctx.db.get(currentProjectId);
      if (!project) {
        throw new ConvexError(ERRORS.NOT_FOUND);
      }

      await ctx.db.patch(user._id, {
        currentProjectId,
        currentWorkspaceId: project.workspaceId,
      });
      return;
    }

    // Clear the current project
    await ctx.db.patch(user._id, { currentProjectId: undefined });
  },
});

export const updateCurrentWorkspace = mutation({
  args: {
    currentWorkspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, { currentWorkspaceId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }
    await ctx.db.patch(user._id, { currentWorkspaceId });
  },
});

export const updateCurrentWorkspaceByExternalId = mutation({
  args: {
    currentWorkspaceExternalId: v.string(),
  },
  handler: async (ctx, { currentWorkspaceExternalId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }
    const workspace = await getTeamWorkspaceByExternalId(
      ctx,
      currentWorkspaceExternalId
    );
    if (!workspace) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }
    await ctx.db.patch(user._id, { currentWorkspaceId: workspace._id });
  },
});

export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, { firstName, lastName, imageUrl }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    // Build fullName from firstName and lastName
    let fullName: string | undefined;
    if (firstName || lastName) {
      fullName = `${firstName || ""} ${lastName || ""}`.trim();
    }

    await ctx.db.patch(user._id, {
      firstName,
      lastName,
      fullName,
      imageUrl,
    });
  },
});

export const clearCurrentWorkspaceAndProjectInternal = internalMutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, { userId, workspaceId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    // Only clear if the user's current workspace matches the workspace they're being removed from
    if (user.currentWorkspaceId === workspaceId) {
      await ctx.db.patch(userId, {
        currentWorkspaceId: undefined,
        currentProjectId: undefined,
      });
    }
  },
});
