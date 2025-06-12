import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";
import { cascadePool } from "../../../components/workpools";

export const batchDelete = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    brandId: v.id("brands"),
    numItems: v.number(),
  },
  handler: async (ctx, { brandId, cursor, numItems }) => {
    // Get the audiences
    const { page, continueCursor } = await ctx.db
      .query("audiences")
      .withIndex("by_brand_id", (q) => q.eq("brandId", brandId))
      .paginate({
        numItems,
        cursor: cursor ?? null,
      });

    // If there are no audiences, return
    if (page.length === 0) {
      return;
    }

    // Delete the campaigns
    await asyncMap(page, async (audience) => await ctx.db.delete(audience._id));

    // If there are more campaigns, delete them
    if (
      continueCursor &&
      continueCursor !== cursor &&
      page.length === numItems
    ) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.brands.audiences.utils.batchDelete,
        {
          brandId,
          cursor: continueCursor,
          numItems,
        }
      );
    }
  },
});
