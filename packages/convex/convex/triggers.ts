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
  aggregateMemoizedDocuments,
  aggregateTestimonials,
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

// Cascade delete all campaigns and brands and media when a project is deleted
triggers.register("projects", async (ctx, change) => {
  if (change.operation === "delete") {
    // Delete campaigns
    await cascadePool.enqueueMutation(
      ctx,
      internal.collections.campaigns.utils.batchDelete,
      {
        projectId: change.id,
        numItems: 25,
      }
    );

    // Delete Media
    await cascadePool.enqueueMutation(
      ctx,
      internal.collections.storage.media.utils.batchDelete,
      {
        projectId: change.id,
        numItems: 25,
      }
    );

    // Delete documents
    await cascadePool.enqueueMutation(
      ctx,
      internal.collections.storage.documents.utils.batchDelete,
      {
        projectId: change.id,
        numItems: 25,
      }
    );

    // Delete knowledge bases
    await cascadePool.enqueueMutation(
      ctx,
      internal.collections.storage.knowledgeBases.utils.batchDelete,
      {
        projectId: change.id,
        numItems: 25,
      }
    );

    // Delete brand
    await ctx.runMutation(
      internal.collections.brands.mutations.deletePermanentByProjectId,
      {
        projectId: change.id,
      }
    );
  }
});

// Cascade delete all brand collections when a brand is deleted (audiences, features, socials, testimonials, themes)
triggers.register("brands", async (ctx, change) => {
  if (change.operation === "delete") {
    // Delete audiences
    await cascadePool.enqueueMutation(
      ctx,
      internal.collections.brands.audiences.utils.batchDelete,
      {
        brandId: change.id,
        numItems: 25,
      }
    );

    // Delete features
    await cascadePool.enqueueMutation(
      ctx,
      internal.collections.brands.features.utils.batchDelete,
      {
        brandId: change.id,
        numItems: 25,
      }
    );

    // Delete socials
    await cascadePool.enqueueMutation(
      ctx,
      internal.collections.brands.socials.utils.batchDelete,
      {
        brandId: change.id,
        numItems: 25,
      }
    );

    // Delete testimonials
    await cascadePool.enqueueMutation(
      ctx,
      internal.collections.brands.testimonials.utils.batchDelete,
      {
        brandId: change.id,
        numItems: 25,
      }
    );

    // Delete themes
    await cascadePool.enqueueMutation(
      ctx,
      internal.collections.brands.themes.utils.batchDelete,
      {
        brandId: change.id,
        numItems: 25,
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

// Cascade delete all memoized documents when a knowledge base is deleted
triggers.register("knowledgeBases", async (ctx, change) => {
  if (change.operation === "delete") {
    // Delete the memoized documents
    await cascadePool.enqueueMutation(
      ctx,
      internal.collections.storage.documents.memoized.utils.batchDelete,
      {
        knowledgeBaseId: change.id,
        numItems: 25,
      }
    );
  }
});

// Cascade delete all vectors when a memoized document is deleted
triggers.register("memoizedDocuments", async (ctx, change) => {
  if (change.operation === "delete") {
    // Delete the document vectors
    await cascadePool.enqueueMutation(
      ctx,
      internal.collections.storage.documents.vectors.utils
        .batchDeleteByKnowledgeBaseId,
      {
        knowledgeBaseId: change.oldDoc.knowledgeBaseId,
        numItems: 25,
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
  // If the document is a memory item, don't aggregate it
  if (change.newDoc?.isMemoryItem || change.oldDoc?.isMemoryItem) {
    return;
  }

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

// Memoized Documents Aggregate
triggers.register("memoizedDocuments", async (ctx, change) => {
  if (change.operation === "insert") {
    const doc = change.newDoc;
    await aggregateMemoizedDocuments.insert(ctx, doc);
  } else if (change.operation === "update") {
    const newDoc = change.newDoc;
    const oldDoc = change.oldDoc;
    await aggregateMemoizedDocuments.replace(ctx, oldDoc, newDoc);
  } else if (change.operation === "delete") {
    const doc = change.oldDoc;
    await aggregateMemoizedDocuments.delete(ctx, doc);
  }
});

// Testimonials Aggregate
triggers.register("testimonials", async (ctx, change) => {
  if (change.operation === "insert") {
    const doc = change.newDoc;
    await aggregateTestimonials.insert(ctx, doc);
  } else if (change.operation === "update") {
    const newDoc = change.newDoc;
    const oldDoc = change.oldDoc;
    await aggregateTestimonials.replace(ctx, oldDoc, newDoc);
  } else if (change.operation === "delete") {
    const doc = change.oldDoc;
    await aggregateTestimonials.deleteIfExists(ctx, doc);
  }
});

// @CHUNKING

// Chunk Document
triggers.register("documents", async (ctx, change) => {
  if (change.operation === "insert" && !change.newDoc.isMemoryItem) {
    await ctx.scheduler.runAfter(
      0,
      internal.collections.storage.documents.chunks.actions.chunkDocument,
      {
        documentId: change.newDoc._id,
        name: change.newDoc.name,
        key: change.newDoc.key,
        type: change.newDoc.type,
        workspaceId: change.newDoc.workspaceId,
        projectId: change.newDoc.projectId,
      }
    );
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
      internal.collections.storage.media.vectors.actions.vectorize,
      {
        mediaId: doc._id,
        mediaKey: doc.key,
        projectId: doc.projectId,
        workspaceId: doc.workspaceId,
      }
    );
  }
});

// Document Vectorization
triggers.register("documents", async (ctx, change) => {
  if (change.operation === "update") {
    const doc = change.newDoc;
    const oldDoc = change.oldDoc;
    if (
      doc.chunkingStatus === "chunked" &&
      oldDoc.chunkingStatus !== "chunked" &&
      doc.knowledgeBases &&
      doc.knowledgeBases.length > 0
    ) {
      await vectorizationPool.enqueueAction(
        ctx,
        internal.collections.storage.documents.vectors.actions.vectorize,
        {
          documentId: doc._id,
          projectId: doc.projectId,
          workspaceId: doc.workspaceId,
          knowledgeBases: doc.knowledgeBases,
        }
      );
    }
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
