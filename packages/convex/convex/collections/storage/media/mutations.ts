import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import {
  internalMutationWithTrigger,
  mutationWithTrigger,
} from "../../../triggers";
import { getCurrentUser } from "../../users/utils";
import { mediaSchema } from "./schema";

export const create = mutationWithTrigger({
  args: {
    key: v.string(),
    name: v.string(),
    extension: v.string(),
    size: v.number(),
    type: mediaSchema.fields.type,
    source: mediaSchema.fields.source,
    aiMetadata: mediaSchema.fields.aiMetadata,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const projectId = user.currentProject;
    const workspaceId = user.currentWorkspaceId;

    if (!projectId || !workspaceId) {
      throw new Error("You are not allowed to create a media");
    }

    const mediaId = await ctx.db.insert("media", {
      ...args,
      workspaceId,
      projectId,
      createdBy: user._id,
    });

    return mediaId;
  },
});

export const deleteInternal = internalMutationWithTrigger({
  args: {
    id: v.id("media"),
  },
  handler: async (ctx, { id }) => {
    try {
      await ctx.db.delete(id);
    } catch (error) {
      console.error(error);
    }
  },
});

export const deleteTemporary = mutationWithTrigger({
  args: {
    id: v.id("media"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);

    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to delete this image");
    }

    // Check media is owned by user
    const media = await ctx.db.get(id);
    if (media?.workspaceId !== user?.currentWorkspaceId) {
      throw new Error("You are not allowed to delete this image");
    }

    await ctx.db.patch(id, {
      deletedAt: new Date().toISOString(),
    });
  },
});

export const deletePermanent = internalMutationWithTrigger({
  args: {
    id: v.id("media"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to delete this image");
    }

    await ctx.db.delete(id);
  },
});

export const archive = mutationWithTrigger({
  args: {
    id: v.id("media"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to archive this image");
    }

    await ctx.db.patch(id, { isArchived: true });
  },
});

export const restore = mutationWithTrigger({
  args: {
    id: v.id("media"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to restore this image");
    }

    await ctx.db.patch(id, { isArchived: false });
  },
});

export const archiveMultiple = mutationWithTrigger({
  args: {
    ids: v.array(v.id("media")),
  },
  handler: async (ctx, { ids }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to archive multiple images");
    }

    await asyncMap(ids, async (id) => {
      await ctx.db.patch(id, { isArchived: true });
    });
  },
});

export const restoreMultiple = mutationWithTrigger({
  args: {
    ids: v.array(v.id("media")),
  },
  handler: async (ctx, { ids }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to restore multiple images");
    }

    await asyncMap(ids, async (id) => {
      await ctx.db.patch(id, { isArchived: false });
    });
  },
});

export const deleteTemporaryMultiple = mutationWithTrigger({
  args: {
    ids: v.array(v.id("media")),
  },
  handler: async (ctx, { ids }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to delete multiple images");
    }

    await asyncMap(ids, async (id) => {
      await ctx.db.patch(id, { deletedAt: new Date().toISOString() });
    });
  },
});
