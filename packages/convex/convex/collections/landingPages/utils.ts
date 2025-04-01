import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import { cascadePool } from "../../workpools";

export const batchDelete = internalMutation({
  args: {
    cursor: v.string(),
    campaignId: v.id("campaigns"),
    numItems: v.number(),
  },
  handler: async (ctx, { campaignId, cursor, numItems }) => {
    // Get the landing pages
    const { page, continueCursor } = await ctx.db
      .query("landingPages")
      .withIndex("by_campaign_id", (q) => q.eq("campaignId", campaignId))
      .paginate({
        numItems,
        cursor,
      });

    // If there are no landing pages, return
    if (page.length === 0) {
      return;
    }

    // Delete the landing pages
    await asyncMap(page, (landingPage) =>
      ctx.runMutation(
        internal.collections.landingPages.mutations.deleteInternal,
        {
          id: landingPage._id,
        }
      )
    );

    // If there are more landing pages, delete them
    if (continueCursor && continueCursor !== cursor) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.landingPages.utils.batchDelete,
        {
          campaignId,
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
    // Get the landing pages that are scheduled to be deleted
    const { page, continueCursor } = await ctx.db
      .query("landingPages")
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

    // If there are no landing pages, return
    if (page.length === 0) {
      return;
    }

    // Delete the landing pages
    await asyncMap(page, (landingPage) =>
      ctx.runMutation(
        internal.collections.landingPages.mutations.deleteInternal,
        { id: landingPage._id }
      )
    );

    // If there are more landing pages, delete them
    if (continueCursor && continueCursor !== cursor) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.landingPages.utils.deleteCleanup,
        {
          cursor: continueCursor,
          numItems,
        }
      );
    }
  },
});
