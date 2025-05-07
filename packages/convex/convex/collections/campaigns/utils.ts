import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import { cascadePool } from "../../workpools";

export const batchDelete = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    projectId: v.id("projects"),
    numItems: v.number(),
  },
  handler: async (ctx, { projectId, cursor, numItems }) => {
    // Get the campaigns
    const { page, continueCursor } = await ctx.db
      .query("campaigns")
      .withIndex("by_project_id", (q) => q.eq("projectId", projectId))
      .paginate({
        numItems,
        cursor: cursor ?? null,
      });

    // If there are no campaigns, return
    if (page.length === 0) {
      return;
    }

    // Delete the campaigns
    await asyncMap(page, (campaign) =>
      ctx.runMutation(internal.collections.campaigns.mutations.deleteInternal, {
        id: campaign._id,
      })
    );

    // If there are more campaigns, delete them
    if (
      continueCursor &&
      continueCursor !== cursor &&
      page.length === numItems
    ) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.campaigns.utils.batchDelete,
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
    // Get the campaigns that are scheduled to be deleted
    const { page, continueCursor } = await ctx.db
      .query("campaigns")
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

    // If there are no campaigns, return
    if (page.length === 0) {
      return;
    }

    // Delete the campaigns
    await asyncMap(page, (campaign) =>
      ctx.runMutation(internal.collections.campaigns.mutations.deleteInternal, {
        id: campaign._id,
      })
    );

    // If there are more campaigns, delete them
    if (
      continueCursor &&
      continueCursor !== cursor &&
      page.length === numItems
    ) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.campaigns.utils.deleteCleanup,
        {
          cursor: continueCursor,
          numItems,
        }
      );
    }
  },
});
