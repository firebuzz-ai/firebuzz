import { v } from "convex/values";
import {
  internalMutationWithTrigger,
  mutationWithTrigger,
} from "../../../triggers";
import { getCurrentUser } from "../../users/utils";
import { mediaSchema } from "./schema";

/*  key: v.string(),
  name: v.string(),
  extension: v.string(),
  size: v.number(),
  type: v.union(v.literal("image"), v.literal("video"), v.literal("audio")),
  source: v.union(
    v.literal("ai-generated"),
    v.literal("uploaded"),
    v.literal("unsplash"),
    v.literal("pexels")
  ),
  aiMetadata: v.optional(
    v.object({
      prompt: v.string(),
      seed: v.number(),
      size: v.string(),
    })
  ), */

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
    await ctx.db.delete(id);
  },
});
