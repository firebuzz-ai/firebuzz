import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";
import {
  internalMutationWithTrigger,
  mutationWithTrigger,
} from "../../../triggers";
import { vectorizationPool } from "../../../workpools";
import { getCurrentUser } from "../../users/utils";
import { documentsSchema } from "./schema";

export const create = mutationWithTrigger({
  args: {
    key: v.string(),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
    memories: v.array(v.id("memories")),
    type: documentsSchema.fields.type,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const projectId = user.currentProject;
    const workspaceId = user.currentWorkspaceId;

    if (!projectId || !workspaceId) {
      throw new Error("You are not allowed to create a document");
    }

    // Check memories exist
    const memories = args.memories;
    const hasMemories = memories.length > 0;

    const documentId = await ctx.db.insert("documents", {
      ...args,
      workspaceId,
      projectId,
      createdBy: user._id,
      vectorizationStatus: hasMemories ? "pending" : "not-started",
    });

    // Start chunking and vectorization process
    if (hasMemories) {
      await vectorizationPool.enqueueAction(
        ctx,
        internal.collections.storage.documents.actions.chunkAndVectorize,
        {
          documentId,
          memories,
          type: args.type,
          workspaceId,
          projectId,
          key: args.key,
        }
      );
    }

    return documentId;
  },
});

export const deleteInternal = internalMutationWithTrigger({
  args: {
    id: v.id("documents"),
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
    id: v.id("documents"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);

    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to delete this document");
    }

    // Check media is owned by user
    const document = await ctx.db.get(id);
    if (document?.workspaceId !== user?.currentWorkspaceId) {
      throw new Error("You are not allowed to delete this document");
    }

    await ctx.db.patch(id, {
      deletedAt: new Date().toISOString(),
    });
  },
});

export const deletePermanent = internalMutationWithTrigger({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to delete this document");
    }

    await ctx.db.delete(id);
  },
});

export const archive = mutationWithTrigger({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to archive this document");
    }

    await ctx.db.patch(id, { isArchived: true });
  },
});

export const restore = mutationWithTrigger({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to restore this document");
    }

    await ctx.db.patch(id, { isArchived: false });
  },
});

export const archiveMultiple = mutationWithTrigger({
  args: {
    ids: v.array(v.id("documents")),
  },
  handler: async (ctx, { ids }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to archive multiple documents");
    }

    await asyncMap(ids, async (id) => {
      await ctx.db.patch(id, { isArchived: true });
    });
  },
});

export const restoreMultiple = mutationWithTrigger({
  args: {
    ids: v.array(v.id("documents")),
  },
  handler: async (ctx, { ids }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to restore multiple documents");
    }

    await asyncMap(ids, async (id) => {
      await ctx.db.patch(id, { isArchived: false });
    });
  },
});

export const deleteTemporaryMultiple = mutationWithTrigger({
  args: {
    ids: v.array(v.id("documents")),
  },
  handler: async (ctx, { ids }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to delete multiple documents");
    }

    await asyncMap(ids, async (id) => {
      await ctx.db.patch(id, { deletedAt: new Date().toISOString() });
    });
  },
});

export const updateVectorizationStatus = internalMutation({
  args: {
    documentId: v.id("documents"),
    status: documentsSchema.fields.vectorizationStatus,
  },
  handler: async (ctx, { documentId, status }) => {
    await ctx.db.patch(documentId, { vectorizationStatus: status });
  },
});
