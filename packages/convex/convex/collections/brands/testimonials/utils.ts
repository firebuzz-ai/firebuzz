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
    // Get the testimonials
    const { page, continueCursor } = await ctx.db
      .query("testimonials")
      .withIndex("by_brand_id", (q) => q.eq("brandId", brandId))
      .paginate({
        numItems,
        cursor: cursor ?? null,
      });

    // If there are no testimonials, return
    if (page.length === 0) {
      return;
    }

    // Delete the testimonials
    await asyncMap(
      page,
      async (testimonial) => await ctx.db.delete(testimonial._id)
    );

    // If there are more testimonials, delete them
    if (
      continueCursor &&
      continueCursor !== cursor &&
      page.length === numItems
    ) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.brands.testimonials.utils.batchDelete,
        {
          brandId,
          cursor: continueCursor,
          numItems,
        }
      );
    }
  },
});
