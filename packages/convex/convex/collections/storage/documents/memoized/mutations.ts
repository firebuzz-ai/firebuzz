import { asyncMap } from "convex-helpers";
import { ConvexError, v } from "convex/values";
import {
  internalMutationWithTrigger,
  mutationWithTrigger,
} from "../../../../triggers";
import { getCurrentUser } from "../../../users/utils";

export const create = internalMutationWithTrigger({
  args: {
    documentId: v.id("documents"),
    knowledgeBases: v.array(v.id("knowledgeBases")),
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    // Get all memoized documents for the document
    const memoizedDocuments = await ctx.db
      .query("memoizedDocuments")
      .withIndex("by_document_id", (q) => q.eq("documentId", args.documentId))
      .collect();

    const existingKnowledgeBaseIds = memoizedDocuments.map(
      (memoizedDocument) => memoizedDocument.knowledgeBaseId
    );

    // Create unique knowledge base ids
    const uniqueKnowledgeBaseIds = args.knowledgeBases.filter(
      (knowledgeBase, index, self) =>
        self.indexOf(knowledgeBase) === index &&
        !existingKnowledgeBaseIds.includes(knowledgeBase)
    );

    await asyncMap(uniqueKnowledgeBaseIds, async (knowledgeBase) => {
      await ctx.db.insert("memoizedDocuments", {
        documentId: args.documentId,
        knowledgeBaseId: knowledgeBase,
        workspaceId: args.workspaceId,
        projectId: args.projectId,
      });
    });
  },
});

export const duplicateToKnowledgeBase = mutationWithTrigger({
  args: {
    memoizedDocumentId: v.id("memoizedDocuments"),
    knowledgeBaseId: v.id("knowledgeBases"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      throw new ConvexError("Unauthorized");
    }

    const memoizedDocument = await ctx.db.get(args.memoizedDocumentId);

    if (!memoizedDocument) {
      throw new ConvexError("Memoized document not found");
    }

    if (memoizedDocument.workspaceId !== user.currentWorkspaceId) {
      throw new ConvexError("Unauthorized");
    }

    // Check if the knowledge base already exists
    const knowledgeBase = await ctx.db.get(args.knowledgeBaseId);

    if (!knowledgeBase) {
      throw new ConvexError("Knowledge base not found");
    }

    if (knowledgeBase.workspaceId !== user.currentWorkspaceId) {
      throw new ConvexError("Unauthorized");
    }

    // Check origial document
    const originalDocument = await ctx.db.get(memoizedDocument.documentId);

    if (!originalDocument) {
      throw new ConvexError("Original document not found");
    }

    // Check if the document already exists in the knowledge base
    const existingDocument = await ctx.db
      .query("memoizedDocuments")
      .withIndex("by_document_id", (q) =>
        q.eq("documentId", memoizedDocument.documentId)
      )
      .filter((q) => q.eq(q.field("knowledgeBaseId"), args.knowledgeBaseId))
      .first();

    if (existingDocument) {
      throw new ConvexError("Document already exists in knowledge base");
    }

    // Get All Vectors for the document
    const vectors = await ctx.db
      .query("documentVectors")
      .withIndex("by_document_id", (q) =>
        q.eq("documentId", memoizedDocument.documentId)
      )
      .collect();

    // Duplicate Vectors
    await asyncMap(vectors, async (vector) => {
      await ctx.db.insert("documentVectors", {
        ...vector,
        knowledgeBaseId: args.knowledgeBaseId,
      });
    });

    // Create New Memoized Document
    await ctx.db.insert("memoizedDocuments", {
      documentId: memoizedDocument.documentId,
      knowledgeBaseId: args.knowledgeBaseId,
      workspaceId: memoizedDocument.workspaceId,
      projectId: memoizedDocument.projectId,
    });

    // Update Document Knowledge Base
    await ctx.db.patch(memoizedDocument.documentId, {
      knowledgeBases: [
        ...originalDocument.knowledgeBases,
        args.knowledgeBaseId,
      ],
    });
  },
});

export const moveToKnowledgeBase = mutationWithTrigger({
  args: {
    memoizedDocumentId: v.id("memoizedDocuments"),
    knowledgeBaseId: v.id("knowledgeBases"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      throw new ConvexError("Unauthorized");
    }

    const memoizedDocument = await ctx.db.get(args.memoizedDocumentId);

    if (!memoizedDocument) {
      throw new ConvexError("Memoized document not found");
    }

    if (memoizedDocument.workspaceId !== user.currentWorkspaceId) {
      throw new ConvexError("Unauthorized");
    }

    // Check if the knowledge base already exists
    const knowledgeBase = await ctx.db.get(args.knowledgeBaseId);

    if (!knowledgeBase) {
      throw new ConvexError("Knowledge base not found");
    }

    if (knowledgeBase.workspaceId !== user.currentWorkspaceId) {
      throw new ConvexError("Unauthorized");
    }

    // Get Original Document
    const originalDocument = await ctx.db.get(memoizedDocument.documentId);

    if (!originalDocument) {
      throw new ConvexError("Original document not found");
    }

    // Check if the document already exists in the knowledge base
    const existingDocument = await ctx.db
      .query("memoizedDocuments")
      .withIndex("by_document_id", (q) =>
        q.eq("documentId", memoizedDocument.documentId)
      )
      .filter((q) => q.eq(q.field("knowledgeBaseId"), args.knowledgeBaseId))
      .first();

    if (existingDocument) {
      throw new ConvexError("Document already exists in knowledge base");
    }

    // Get All Vectors for the document
    const vectors = await ctx.db
      .query("documentVectors")
      .withIndex("by_document_id", (q) =>
        q.eq("documentId", memoizedDocument.documentId)
      )
      .collect();

    // Update Vectors Knowledge Base
    await asyncMap(vectors, async (vector) => {
      await ctx.db.patch(vector._id, {
        knowledgeBaseId: args.knowledgeBaseId,
      });
    });

    // Update Original Document Knowledge Base
    await ctx.db.patch(memoizedDocument.documentId, {
      knowledgeBases: originalDocument.knowledgeBases
        .filter((id) => id !== memoizedDocument.knowledgeBaseId)
        .concat(args.knowledgeBaseId),
    });

    // Update Memoized Document Knowledge Base
    await ctx.db.patch(memoizedDocument._id, {
      knowledgeBaseId: args.knowledgeBaseId,
    });
  },
});

export const deletePermanent = mutationWithTrigger({
  args: {
    id: v.id("memoizedDocuments"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      throw new ConvexError("Unauthorized");
    }

    const memoizedDocument = await ctx.db.get(args.id);

    if (!memoizedDocument) {
      throw new ConvexError("Memoized document not found");
    }

    if (memoizedDocument.workspaceId !== user.currentWorkspaceId) {
      throw new ConvexError("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});

export const deletePermanentMultiple = mutationWithTrigger({
  args: {
    ids: v.array(v.id("memoizedDocuments")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      throw new ConvexError("Unauthorized");
    }

    const memoizedDocuments = await asyncMap(args.ids, async (id) => {
      const memoizedDocument = await ctx.db.get(id);

      if (!memoizedDocument) {
        throw new ConvexError("Memoized document not found");
      }

      return memoizedDocument;
    });

    if (
      memoizedDocuments.some(
        (memoizedDocument) =>
          memoizedDocument.workspaceId !== user.currentWorkspaceId
      )
    ) {
      throw new ConvexError("Unauthorized");
    }

    await asyncMap(memoizedDocuments, (memoizedDocument) =>
      ctx.db.delete(memoizedDocument._id)
    );
  },
});

export const deletePermanentByDocumentId = internalMutationWithTrigger({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("memoizedDocuments")
      .withIndex("by_document_id", (q) => q.eq("documentId", args.documentId))
      .collect();

    if (!items) {
      return;
    }

    await asyncMap(items, (item) => ctx.db.delete(item._id));
  },
});
