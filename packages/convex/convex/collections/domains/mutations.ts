import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import {
  internalMutationWithTrigger,
  mutationWithTrigger,
} from "../../triggers";
import { getCurrentUserWithWorkspace } from "../users/utils";
import { domainSchema } from "./schema";

export const createInternal = internalMutationWithTrigger({
  args: {
    hostname: v.string(),
    status: domainSchema.fields.status,
    cloudflareHostnameId: v.string(),
    sslStatus: domainSchema.fields.sslStatus,
    sslExpiresAt: domainSchema.fields.sslExpiresAt,
    verificationRecord: domainSchema.fields.verificationRecord,
    metadata: domainSchema.fields.metadata,
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const customDomainId = await ctx.db.insert("domains", {
      ...args,
      status: args.status,
      sslStatus: args.sslStatus,
      sslExpiresAt: args.sslExpiresAt,
      verificationRecord: args.verificationRecord,
      workspaceId: args.workspaceId,
      projectId: args.projectId,
      createdBy: args.createdBy,
    });

    return customDomainId;
  },
});

export const updateStatus = mutationWithTrigger({
  args: {
    id: v.id("domains"),
    status: domainSchema.fields.status,
    sslStatus: domainSchema.fields.sslStatus,
    sslExpiresAt: domainSchema.fields.sslExpiresAt,
    lastCheckedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to update this custom domain");
    }

    // Check domain is owned by user's workspace
    const domain = await ctx.db.get(args.id);
    if (domain?.workspaceId !== user?.currentWorkspaceId) {
      throw new Error("You are not allowed to update this custom domain");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      sslStatus: args.sslStatus ?? domain?.sslStatus,
      sslExpiresAt: args.sslExpiresAt ?? domain?.sslExpiresAt,
      lastCheckedAt: args.lastCheckedAt ?? new Date().toISOString(),
    });
  },
});

export const updateStatusInternal = internalMutationWithTrigger({
  args: {
    id: v.id("domains"),
    status: domainSchema.fields.status,
    sslStatus: domainSchema.fields.sslStatus,
    sslExpiresAt: domainSchema.fields.sslExpiresAt,
    lastCheckedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.id);

    await ctx.db.patch(args.id, {
      status: args.status,
      sslStatus: args.sslStatus ?? domain?.sslStatus,
      sslExpiresAt: args.sslExpiresAt ?? domain?.sslExpiresAt,
      lastCheckedAt: args.lastCheckedAt ?? new Date().toISOString(),
    });
  },
});

export const updateMetadata = mutationWithTrigger({
  args: {
    id: v.id("domains"),
    metadata: domainSchema.fields.metadata,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to update this custom domain");
    }

    // Check domain is owned by user's workspace
    const domain = await ctx.db.get(args.id);
    if (domain?.workspaceId !== user?.currentWorkspaceId) {
      throw new Error("You are not allowed to update this custom domain");
    }

    await ctx.db.patch(args.id, {
      metadata: args.metadata,
    });
  },
});

export const deleteTemporary = mutationWithTrigger({
  args: {
    id: v.id("domains"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to delete this custom domain");
    }

    // Check domain is owned by user's workspace
    const domain = await ctx.db.get(id);
    if (domain?.workspaceId !== user?.currentWorkspaceId) {
      throw new Error("You are not allowed to delete this custom domain");
    }

    await ctx.db.patch(id, {
      deletedAt: new Date().toISOString(),
    });
  },
});

export const deletePermanent = internalMutationWithTrigger({
  args: {
    id: v.id("domains"),
  },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const archive = mutationWithTrigger({
  args: {
    id: v.id("domains"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to archive this custom domain");
    }

    // Check domain is owned by user's workspace
    const domain = await ctx.db.get(id);
    if (domain?.workspaceId !== user?.currentWorkspaceId) {
      throw new Error("You are not allowed to archive this custom domain");
    }

    await ctx.db.patch(id, { isArchived: true });
  },
});

export const restore = mutationWithTrigger({
  args: {
    id: v.id("domains"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to restore this custom domain");
    }

    // Check domain is owned by user's workspace
    const domain = await ctx.db.get(id);
    if (domain?.workspaceId !== user?.currentWorkspaceId) {
      throw new Error("You are not allowed to restore this custom domain");
    }

    await ctx.db.patch(id, { isArchived: false });
  },
});

export const archiveMultiple = mutationWithTrigger({
  args: {
    ids: v.array(v.id("domains")),
  },
  handler: async (ctx, { ids }) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to archive multiple custom domains");
    }

    await asyncMap(ids, async (id) => {
      // Check each domain is owned by user's workspace
      const domain = await ctx.db.get(id);
      if (domain?.workspaceId !== user?.currentWorkspaceId) {
        throw new Error("You are not allowed to archive this custom domain");
      }
      await ctx.db.patch(id, { isArchived: true });
    });
  },
});

export const restoreMultiple = mutationWithTrigger({
  args: {
    ids: v.array(v.id("domains")),
  },
  handler: async (ctx, { ids }) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to restore multiple custom domains");
    }

    await asyncMap(ids, async (id) => {
      // Check each domain is owned by user's workspace
      const domain = await ctx.db.get(id);
      if (domain?.workspaceId !== user?.currentWorkspaceId) {
        throw new Error("You are not allowed to restore this custom domain");
      }
      await ctx.db.patch(id, { isArchived: false });
    });
  },
});

export const deleteTemporaryMultiple = mutationWithTrigger({
  args: {
    ids: v.array(v.id("domains")),
  },
  handler: async (ctx, { ids }) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    if (!user || !user.currentWorkspaceId) {
      throw new Error("You are not allowed to delete multiple custom domains");
    }

    await asyncMap(ids, async (id) => {
      // Check each domain is owned by user's workspace
      const domain = await ctx.db.get(id);
      if (domain?.workspaceId !== user?.currentWorkspaceId) {
        throw new Error("You are not allowed to delete this custom domain");
      }
      await ctx.db.patch(id, { deletedAt: new Date().toISOString() });
    });
  },
});
