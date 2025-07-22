import { ConvexError, v } from "convex/values";

import { paginationOptsValidator } from "convex/server";
import { internalQuery, query } from "../../../_generated/server";
import { aggregateMedia } from "../../../components/aggregates";
import { getCurrentUserWithWorkspace } from "../../users/utils";
import { mediaSchema } from "./schema";

export const getPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    sortOrder: v.union(v.literal("asc"), v.literal("desc")),
    source: v.optional(mediaSchema.validator.fields.source),
    type: v.optional(mediaSchema.validator.fields.type),
    searchQuery: v.optional(v.string()),
    isArchived: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { paginationOpts, sortOrder, source, type, searchQuery, isArchived }
  ) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    const projectId = user?.currentProjectId;

    if (!user || !projectId) {
      throw new ConvexError("User not found");
    }

    // If there's a search query, use the search index
    const query = searchQuery
      ? ctx.db
          .query("media")
          .withSearchIndex("by_fileName", (q) => q.search("name", searchQuery))

          .filter((q) => q.eq(q.field("projectId"), projectId))
          .filter((q) => (source ? q.eq(q.field("source"), source) : true))
          .filter((q) => (type ? q.eq(q.field("type"), type) : true))
          .filter((q) =>
            isArchived ? q.eq(q.field("isArchived"), isArchived ?? false) : true
          )

          .filter((q) => q.eq(q.field("deletedAt"), undefined))

          .paginate(paginationOpts)
      : ctx.db
          .query("media")
          .withIndex("by_project_id", (q) => q.eq("projectId", projectId))
          .filter((q) =>
            isArchived ? q.eq(q.field("isArchived"), isArchived ?? false) : true
          )
          .filter((q) => (source ? q.eq(q.field("source"), source) : true))
          .filter((q) => (type ? q.eq(q.field("type"), type) : true))
          .filter((q) => q.eq(q.field("deletedAt"), undefined))
          .order(sortOrder)
          .paginate(paginationOpts);

    return await query;
  },
});

export const getById = query({
  args: {
    id: v.id("media"),
  },
  handler: async (ctx, args) => {
    await getCurrentUserWithWorkspace(ctx);
    const media = await ctx.db.get(args.id);
    if (!media) {
      throw new ConvexError("Media not found");
    }
    const createdBy = await ctx.db.get(media.createdBy);
    return {
      ...media,
      createdBy,
    };
  },
});

export const getByIdInternal = internalQuery({
  args: {
    id: v.id("media"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getTotalSize = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await aggregateMedia.sum(ctx, {
      namespace: args.projectId,
      // @ts-ignore
      bounds: {},
    });
  },
});

export const getTotalCount = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await aggregateMedia.count(ctx, {
      namespace: args.projectId,
      bounds: {},
    });
  },
});

export const getRecentGenerations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    const projectId = user?.currentProjectId;

    if (!user || !projectId) {
      throw new ConvexError("Not authorized");
    }

    const generations = await ctx.db
      .query("media")
      .withIndex("by_project_id", (q) => q.eq("projectId", projectId))
      .filter((q) => q.eq(q.field("source"), "ai-generated"))
      .order("desc")
      .take(5);

    return generations;
  },
});
