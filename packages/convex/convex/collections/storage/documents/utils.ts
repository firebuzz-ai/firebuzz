import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";
import {
  batchDeleteStoragePool,
  cascadePool,
} from "../../../components/workpools";

export const batchDelete = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    projectId: v.id("projects"),
    numItems: v.number(),
  },
  handler: async (ctx, { projectId, cursor, numItems }) => {
    const { page, continueCursor } = await ctx.db
      .query("documents")
      .withIndex("by_project_id", (q) => q.eq("projectId", projectId))
      .paginate({ numItems, cursor: cursor ?? null });

    // If there are no documents, return
    if (page.length === 0) {
      return;
    }

    // Delete the documents
    await asyncMap(page, (document) =>
      ctx.runMutation(
        internal.collections.storage.documents.mutations.deleteInternal,
        { id: document._id }
      )
    );

    // Delete files from R2
    const filesWithKeys = page.filter((document) => document.key);
    await asyncMap(filesWithKeys, (document) =>
      batchDeleteStoragePool.enqueueMutation(
        ctx,
        internal.components.r2.deletePermanent,
        {
          key: document.key,
        }
      )
    );

    // Continue deleting media items if there are more
    if (
      continueCursor &&
      continueCursor !== cursor &&
      page.length === numItems
    ) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.storage.documents.utils.batchDelete,
        {
          projectId,
          cursor: continueCursor,
          numItems,
        }
      );
    }
  },
});

export const deleteCleanup = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    numItems: v.number(),
    deletionThresholdTimestamp: v.optional(v.string()),
  },
  handler: async (ctx, { cursor, numItems, deletionThresholdTimestamp }) => {
    // Calculate timestamp once or use the one passed in
    const threshold =
      deletionThresholdTimestamp ??
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get the documents that are scheduled to be deleted
    const { page, continueCursor } = await ctx.db
      .query("documents")
      .withIndex("by_deleted_at", (q) => q.lte("deletedAt", threshold))
      .filter((q) => q.neq(q.field("deletedAt"), undefined))
      .paginate({
        numItems,
        cursor: cursor ?? null,
      });

    // If there are no documents, return
    if (page.length === 0) {
      return;
    }

    // Delete the documents
    await asyncMap(page, (document) =>
      ctx.runMutation(
        internal.collections.storage.documents.mutations.deleteInternal,
        { id: document._id }
      )
    );

    // If there are more documents, delete them
    if (
      continueCursor &&
      continueCursor !== cursor &&
      page.length === numItems
    ) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.storage.documents.utils.deleteCleanup,
        {
          cursor: continueCursor,
          numItems,
          deletionThresholdTimestamp: threshold,
        }
      );
    }
  },
});
