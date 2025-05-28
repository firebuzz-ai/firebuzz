import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";
import { cascadePool } from "../../../workpools";

export const batchDelete = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    brandId: v.id("brands"),
    numItems: v.number(),
  },
  handler: async (ctx, { brandId, cursor, numItems }) => {
    // Get the features
    const { page, continueCursor } = await ctx.db
      .query("features")
      .withIndex("by_brand_id", (q) => q.eq("brandId", brandId))
      .paginate({
        numItems,
        cursor: cursor ?? null,
      });

    // If there are no features, return
    if (page.length === 0) {
      return;
    }

    // Delete the features
    await asyncMap(page, async (feature) => await ctx.db.delete(feature._id));

    // If there are more features, delete them
    if (
      continueCursor &&
      continueCursor !== cursor &&
      page.length === numItems
    ) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.brands.features.utils.batchDelete,
        {
          brandId,
          cursor: continueCursor,
          numItems,
        }
      );
    }
  },
});
