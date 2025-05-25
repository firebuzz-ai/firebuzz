import { ConvexError, v } from "convex/values";

import { query } from "../../_generated/server";
import { getCurrentUser } from "../users/utils";

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const currentProjectId = user?.currentProject;

    if (!user || !currentProjectId) {
      throw new ConvexError("Unauthorized");
    }

    const brand = await ctx.db
      .query("brands")
      .withIndex("by_project_id", (q) => q.eq("projectId", currentProjectId))
      .first();

    if (!brand) {
      throw new ConvexError("Brand not found");
    }

    return brand;
  },
});

export const getById = query({
  args: {
    id: v.id("brands"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      throw new ConvexError("Unauthorized");
    }

    const brand = await ctx.db.get(args.id);

    if (!brand) {
      throw new ConvexError("Brand not found");
    }

    return brand;
  },
});
