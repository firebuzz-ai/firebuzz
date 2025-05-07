import {
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { internalMutation, mutation as rawMutation } from "./_generated/server";

import { asyncMap } from "convex-helpers";
import { getManyFrom } from "convex-helpers/server/relationships";
import { Triggers } from "convex-helpers/server/triggers";
import { internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import {
  aggregateCampaigns,
  aggregateDocuments,
  aggregateLandingPageTemplates,
  aggregateLandingPageVersions,
  aggregateLandingPages,
  aggregateMedia,
} from "./aggregates";
import { cascadePool, vectorizationPool } from "./workpools";

const triggers = new Triggers<DataModel>();

// @CASCADE

// Cascade delete all workspaces when a user is deleted
triggers.register("users", async (ctx, change) => {
  if (change.operation === "delete") {
    await asyncMap(
      await getManyFrom(ctx.db, "workspaces", "by_owner", change.id, "ownerId"),
      (workspace) => ctx.db.delete(workspace._id)
    );
  }
});

// Cascade delete all projects when a workspace is deleted
triggers.register("workspaces", async (ctx, change) => {
  if (change.operation === "delete") {
    await asyncMap(
      await getManyFrom(
        ctx.db,
        "projects",
        "by_workspace_id",
        change.id,
        "workspaceId"
      ),
      (project) => ctx.db.delete(project._id)
    );
  }
});

// Cascade delete all campaigns when a project is deleted
triggers.register("projects", async (ctx, change) => {
  if (change.operation === "delete") {
    // Delete campaigns
    await cascadePool.enqueueMutation(
      ctx,
      internal.collections.campaigns.utils.batchDelete,
      {
        projectId: change.id,
        numItems: 50,
      }
    );

    // Delete Media
    await cascadePool.enqueueMutation(
      ctx,
      internal.collections.storage.media.utils.batchDelete,
      {
        projectId: change.id,
        numItems: 50,
      }
    );
  }
});

// Cascade delete all landing pages when a campaign is deleted
triggers.register("campaigns", async (ctx, change) => {
  if (change.operation === "delete") {
    // Get landing pages with pagination
    const { continueCursor, page } = await ctx.db
      .query("landingPages")
      .withIndex("by_campaign_id", (q) => q.eq("campaignId", change.id))
      .paginate({ numItems: 50, cursor: null });

    // Delete landing pages
    await asyncMap(page, (document) => ctx.db.delete(document._id));

    // Continue deleting landing pages if there are more
    if (continueCursor) {
      await cascadePool.enqueueMutation(
        ctx,
        internal.collections.landingPages.utils.batchDelete,
        {
          campaignId: change.id,
          cursor: continueCursor,
          numItems: 50,
        }
      );
    }
  }
});

// Cascade delete all landing page messages and versions when a landing page is deleted
triggers.register("landingPages", async (ctx, change) => {
  if (change.operation === "delete") {
    // Delete landing page messages
    await cascadePool.enqueueMutation(
      ctx,
      internal.collections.landingPages.messages.utils.batchDelete,
      {
        landingPageId: change.id,
        numItems: 50,
      }
    );
    // Delete landing page versions
    await cascadePool.enqueueMutation(
      ctx,
      internal.collections.landingPages.versions.utils.batchDelete,
      {
        landingPageId: change.id,
        numItems: 50,
      }
    );
  }
});

// @AGGREGATE

// Campaigns Aggregate
triggers.register("campaigns", async (ctx, change) => {
  if (change.operation === "insert") {
    const doc = change.newDoc;
    await aggregateCampaigns.insert(ctx, doc);
  } else if (change.operation === "update") {
    const newDoc = change.newDoc;
    const oldDoc = change.oldDoc;

    // If the campaign is being deleted, delete the aggregate
    if (!oldDoc.deletedAt && newDoc.deletedAt) {
      await aggregateCampaigns.delete(ctx, oldDoc);
    }
    // If the campaign is being restored, insert the aggregate
    else if (oldDoc.deletedAt && !newDoc.deletedAt) {
      await aggregateCampaigns.insert(ctx, newDoc);
    } else {
      await aggregateCampaigns.replace(ctx, oldDoc, newDoc);
    }
  }
});

// Landing Pages Aggregate
triggers.register("landingPages", async (ctx, change) => {
  if (change.operation === "insert") {
    const doc = change.newDoc;
    await aggregateLandingPages.insert(ctx, doc);
  } else if (change.operation === "update") {
    const newDoc = change.newDoc;
    const oldDoc = change.oldDoc;

    // If the landing page is being deleted, delete the aggregate
    if (!oldDoc.deletedAt && newDoc.deletedAt) {
      await aggregateLandingPages.delete(ctx, oldDoc);
    }
    // If the landing page is being restored, insert the aggregate
    else if (oldDoc.deletedAt && !newDoc.deletedAt) {
      await aggregateLandingPages.insert(ctx, newDoc);
    } else {
      await aggregateLandingPages.replace(ctx, oldDoc, newDoc);
    }
  }
});

// Landing Page Versions Aggregate
triggers.register("landingPageVersions", async (ctx, change) => {
  if (change.operation === "delete") {
    const doc = change.oldDoc;
    await aggregateLandingPageVersions.delete(ctx, doc);
  } else if (change.operation === "insert") {
    const doc = change.newDoc;
    await aggregateLandingPageVersions.insert(ctx, doc);
  } else if (change.operation === "update") {
    const newDoc = change.newDoc;
    const oldDoc = change.oldDoc;
    await aggregateLandingPageVersions.replace(ctx, oldDoc, newDoc);
  }
});

// Landing Page Templates Aggregate
triggers.register("landingPageTemplates", async (ctx, change) => {
  if (change.operation === "delete") {
    const doc = change.oldDoc;
    await aggregateLandingPageTemplates.delete(ctx, doc);
  } else if (change.operation === "insert") {
    const doc = change.newDoc;
    await aggregateLandingPageTemplates.insert(ctx, doc);
  } else if (change.operation === "update") {
    const newDoc = change.newDoc;
    const oldDoc = change.oldDoc;
    await aggregateLandingPageTemplates.replace(ctx, oldDoc, newDoc);
  }
});

// Media Aggregate
triggers.register("media", async (ctx, change) => {
  if (change.operation === "insert") {
    const doc = change.newDoc;
    await aggregateMedia.insert(ctx, doc);
  } else if (change.operation === "update") {
    const newDoc = change.newDoc;
    const oldDoc = change.oldDoc;

    // If the media is being deleted, delete the aggregate
    if (!oldDoc.deletedAt && newDoc.deletedAt) {
      await aggregateMedia.delete(ctx, oldDoc);
    }

    // If the media is being restored, insert the aggregate
    else if (oldDoc.deletedAt && !newDoc.deletedAt) {
      await aggregateMedia.insert(ctx, newDoc);
    }

    // If the media is being updated, replace the aggregate
    else {
      await aggregateMedia.replace(ctx, oldDoc, newDoc);
    }
  }
});

// Documents Aggregate
triggers.register("documents", async (ctx, change) => {
  if (change.operation === "insert") {
    const doc = change.newDoc;
    await aggregateDocuments.insert(ctx, doc);
  } else if (change.operation === "update") {
    const newDoc = change.newDoc;
    const oldDoc = change.oldDoc;

    // If the media is being deleted, delete the aggregate
    if (!oldDoc.deletedAt && newDoc.deletedAt) {
      await aggregateDocuments.delete(ctx, oldDoc);
    }

    // If the media is being restored, insert the aggregate
    else if (oldDoc.deletedAt && !newDoc.deletedAt) {
      await aggregateDocuments.insert(ctx, newDoc);
    }

    // If the media is being updated, replace the aggregate
    else {
      await aggregateDocuments.replace(ctx, oldDoc, newDoc);
    }
  }
});

// @VECTORIZATION

// Media Vectorization
triggers.register("media", async (ctx, change) => {
  // Insert
  if (change.operation === "insert") {
    const doc = change.newDoc;
    await vectorizationPool.enqueueAction(
      ctx,
      internal.collections.storage.mediaVectors.actions.vectorize,
      {
        mediaId: doc._id,
        mediaKey: doc.key,
        projectId: doc.projectId,
        workspaceId: doc.workspaceId,
      }
    );
  }
});

export const mutationWithTrigger = customMutation(
  rawMutation,
  customCtx(triggers.wrapDB)
);

export const internalMutationWithTrigger = customMutation(
  internalMutation,
  customCtx(triggers.wrapDB)
);
