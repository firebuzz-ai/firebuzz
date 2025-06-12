import { asyncMap } from "convex-helpers";
import { internalMutation } from "../../../../_generated/server";

import { v } from "convex/values";
import { internal } from "../../../../_generated/api";
import { cascadePool } from "../../../../components/workpools";

export const batchDelete = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    mediaId: v.id("media"),
    numItems: v.number(),
  },
  handler: async (ctx, { mediaId, cursor, numItems }) => {
    const { page, continueCursor } = await ctx.db
      .query("mediaVectors")
      .withIndex("by_media_id", (q) => q.eq("mediaId", mediaId))
      .paginate({ numItems, cursor: cursor ?? null });

    // If there are no media vector items, return
    if (page.length === 0) {
      return;
    }

    // Delete the media vectors
    await asyncMap(page, (document) => ctx.db.delete(document._id));

    // Continue deleting media vectors if there are more
    if (
      continueCursor &&
      continueCursor !== cursor &&
      page.length === numItems
    ) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.storage.media.vectors.utils.batchDelete,
        {
          mediaId,
          cursor: continueCursor,
          numItems,
        }
      );
    }
  },
});
