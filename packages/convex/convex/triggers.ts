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
  aggregateLandingPageTemplates,
  aggregateLandingPageVersions,
  aggregateLandingPages,
} from "./aggregates";

const triggers = new Triggers<DataModel>();

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
    // Get campaigns with pagination
    const { continueCursor, page } = await ctx.db
      .query("campaigns")
      .withIndex("by_project_id", (q) => q.eq("projectId", change.id))
      .paginate({ numItems: 100, cursor: null });

    // Delete campaigns
    await asyncMap(page, (document) => ctx.db.delete(document._id));

    // Continue deleting campaigns if there are more
    if (continueCursor) {
      await ctx.scheduler.runAfter(
        0,
        internal.helpers.batch.batchDeleteCampaigns,
        {
          projectId: change.id,
          cursor: continueCursor,
          numItems: 50,
        }
      );
    }
  }
});

// @aggregate
// Campaigns Aggregate
triggers.register("campaigns", async (ctx, change) => {
  if (change.operation === "delete") {
    const doc = change.oldDoc;
    await aggregateCampaigns.delete(ctx, doc);
  } else if (change.operation === "insert") {
    const doc = change.newDoc;
    await aggregateCampaigns.insert(ctx, doc);
  } else if (change.operation === "update") {
    const newDoc = change.newDoc;
    const oldDoc = change.oldDoc;
    await aggregateCampaigns.replace(ctx, oldDoc, newDoc);
  }
});

// Landing Pages Aggregate
triggers.register("landingPages", async (ctx, change) => {
  if (change.operation === "delete") {
    const doc = change.oldDoc;
    await aggregateLandingPages.delete(ctx, doc);
  } else if (change.operation === "insert") {
    const doc = change.newDoc;
    await aggregateLandingPages.insert(ctx, doc);
  } else if (change.operation === "update") {
    const newDoc = change.newDoc;
    const oldDoc = change.oldDoc;
    await aggregateLandingPages.replace(ctx, oldDoc, newDoc);
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

export const mutationWithTrigger = customMutation(
  rawMutation,
  customCtx(triggers.wrapDB)
);

export const internalMutationWithTrigger = customMutation(
  internalMutation,
  customCtx(triggers.wrapDB)
);
