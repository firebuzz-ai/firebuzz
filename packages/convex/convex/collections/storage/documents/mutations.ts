import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internalMutation } from "../../../_generated/server";
import { r2 } from "../../../helpers/r2";
import {
  internalMutationWithTrigger,
  mutationWithTrigger,
} from "../../../triggers";
import { getCurrentUser } from "../../users/utils";
import { documentsSchema } from "./schema";

export const create = internalMutationWithTrigger({
  args: {
    key: v.string(),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
    knowledgeBases: v.optional(v.array(v.id("knowledgeBases"))),
    type: documentsSchema.fields.type,
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    createdBy: v.id("users"),
    summary: v.string(),
    isLongDocument: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check knowledgeBases exist
    const knowledgeBases = args.knowledgeBases;
    const hasKnowledgeBases = knowledgeBases && knowledgeBases.length > 0;

    const documentId = await ctx.db.insert("documents", {
      ...args,
      knowledgeBases: hasKnowledgeBases ? knowledgeBases : [],
      vectorizationStatus: hasKnowledgeBases ? "queued" : "not-indexed",
    });

    // Insert into memoizedDocuments
    if (hasKnowledgeBases) {
      await asyncMap(knowledgeBases, async (knowledgeBaseId) => {
        await ctx.db.insert("memoizedDocuments", {
          documentId,
          knowledgeBaseId,
        });
      });
    }

    return documentId;
  },
});

export const deleteInternal = internalMutationWithTrigger({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, { id }) => {
    try {
      const document = await ctx.db.get(id);

      if (document?.key) {
        await r2.deleteObject(ctx, document.key);
      }

      await ctx.db.delete(id);
    } catch (error) {
      console.error(error);
    }
  },
});

export const deleteTemporary = mutationWithTrigger({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);

    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to delete this document");
    }

    // Check media is owned by user
    const document = await ctx.db.get(id);
    if (document?.workspaceId !== user?.currentWorkspaceId) {
      throw new Error("You are not allowed to delete this document");
    }

    await ctx.db.patch(id, {
      deletedAt: new Date().toISOString(),
    });
  },
});

export const deletePermanent = internalMutationWithTrigger({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to delete this document");
    }

    await ctx.db.delete(id);
  },
});

export const archive = mutationWithTrigger({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to archive this document");
    }

    await ctx.db.patch(id, { isArchived: true });
  },
});

export const restore = mutationWithTrigger({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to restore this document");
    }

    await ctx.db.patch(id, { isArchived: false });
  },
});

export const archiveMultiple = mutationWithTrigger({
  args: {
    ids: v.array(v.id("documents")),
  },
  handler: async (ctx, { ids }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to archive multiple documents");
    }

    await asyncMap(ids, async (id) => {
      await ctx.db.patch(id, { isArchived: true });
    });
  },
});

export const restoreMultiple = mutationWithTrigger({
  args: {
    ids: v.array(v.id("documents")),
  },
  handler: async (ctx, { ids }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to restore multiple documents");
    }

    await asyncMap(ids, async (id) => {
      await ctx.db.patch(id, { isArchived: false });
    });
  },
});

export const deleteTemporaryMultiple = mutationWithTrigger({
  args: {
    ids: v.array(v.id("documents")),
  },
  handler: async (ctx, { ids }) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to delete multiple documents");
    }

    await asyncMap(ids, async (id) => {
      await ctx.db.patch(id, { deletedAt: new Date().toISOString() });
    });
  },
});

export const updateVectorizationStatus = internalMutation({
  args: {
    documentId: v.id("documents"),
    status: documentsSchema.fields.vectorizationStatus,
  },
  handler: async (ctx, { documentId, status }) => {
    await ctx.db.patch(documentId, { vectorizationStatus: status });
  },
});

export const update = internalMutation({
  args: {
    documentId: v.id("documents"),
    summary: v.optional(v.string()),
    isLongDocument: v.optional(v.boolean()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { documentId, summary, isLongDocument, name }) => {
    await ctx.db.patch(documentId, {
      summary,
      isLongDocument,
      name,
    });
  },
});
