import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";
import { batchDeleteStoragePool, cascadePool } from "../../../workpools";

export const batchDelete = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    projectId: v.id("projects"),
    numItems: v.number(),
  },
  handler: async (ctx, { projectId, cursor, numItems }) => {
    const { page, continueCursor } = await ctx.db
      .query("media")
      .withIndex("by_project_id", (q) => q.eq("projectId", projectId))
      .paginate({ numItems, cursor: cursor ?? null });

    // Delete the media
    await asyncMap(page, (document) => ctx.db.delete(document._id));

    // Delete files from R2
    const filesWithKeys = page.filter((document) => document.key);
    await asyncMap(filesWithKeys, (document) =>
      batchDeleteStoragePool.enqueueMutation(
        ctx,
        internal.helpers.r2.deletePermanent,
        {
          key: document.key,
        }
      )
    );

    // Continue deleting landing page versions if there are more
    if (continueCursor) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.storage.media.utils.batchDelete,
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
  },
  handler: async (ctx, { cursor, numItems }) => {
    // Get the medias that are scheduled to be deleted
    const { page, continueCursor } = await ctx.db
      .query("media")
      .withIndex("by_deleted_at", (q) =>
        q.lte(
          "deletedAt",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        )
      )
      .filter((q) => q.neq(q.field("deletedAt"), undefined))
      .paginate({
        numItems,
        cursor: cursor ?? null,
      });

    // If there are no medias, return
    if (page.length === 0) {
      return;
    }

    // Delete the medias
    await asyncMap(page, (media) =>
      ctx.runMutation(
        internal.collections.storage.media.mutations.deleteInternal,
        { id: media._id }
      )
    );

    // If there are more medias, delete them
    if (continueCursor && continueCursor !== cursor) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.storage.media.utils.deleteCleanup,
        {
          cursor: continueCursor,
          numItems,
        }
      );
    }
  },
});
