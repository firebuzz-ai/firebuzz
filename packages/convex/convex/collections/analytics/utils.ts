import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import { cascadePool } from "../../components/workpools";

// Generate structured key for analytics records
export function generateStructuredKey(params: {
  campaignId: string;
  queryId: string;
  period: string;
  campaignEnvironment: string;
}): string {
  return `${params.campaignId}_${params.queryId}_${params.period}_${params.campaignEnvironment}`;
}

// Batch delete analytics records for a specific campaign
export const batchDeleteByCampaignId = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    campaignId: v.id("campaigns"),
    numItems: v.number(),
  },
  handler: async (ctx, { campaignId, cursor, numItems }) => {
    // Get the analytics records for this campaign
    const { page, continueCursor } = await ctx.db
      .query("analyticsPipes")
      .withIndex("by_campaign_id", (q) => q.eq("campaignId", campaignId))
      .paginate({
        numItems,
        cursor: cursor ?? null,
      });

    // If there are no records, return
    if (page.length === 0) {
      return { deleted: 0 };
    }

    // Delete the analytics records
    await asyncMap(page, (record) => ctx.db.delete(record._id));

    // If there are more records, delete them
    if (
      continueCursor &&
      continueCursor !== cursor &&
      page.length === numItems
    ) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.analytics.utils.batchDeleteByCampaignId,
        {
          campaignId,
          cursor: continueCursor,
          numItems,
        }
      );
    }

    return { deleted: page.length };
  },
});

// Batch delete analytics records by last updated
export const batchDeleteByLastUpdated = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    olderThanDays: v.number(),
    numItems: v.number(),
  },
  handler: async (ctx, { olderThanDays, cursor, numItems }) => {
    const cutoffDate = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    ).toISOString();

    // Get analytics records with conversion event IDs for this campaign
    const { page: staleRecords, continueCursor } = await ctx.db
      .query("analyticsPipes")
      .withIndex("by_last_updated", (q) => q.lt("lastUpdatedAt", cutoffDate))
      .paginate({
        numItems,
        cursor: cursor ?? null,
      });

    // If there are no records, return
    if (staleRecords.length === 0) {
      return { deleted: 0 };
    }

    // Delete stale records
    await asyncMap(staleRecords, (record) => ctx.db.delete(record._id));

    // If there are more records, continue cleanup
    if (
      continueCursor &&
      continueCursor !== cursor &&
      staleRecords.length === numItems
    ) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.analytics.utils.batchDeleteByLastUpdated,
        {
          olderThanDays,
          cursor: continueCursor,
          numItems,
        }
      );
    }

    return { deleted: staleRecords.length };
  },
});
