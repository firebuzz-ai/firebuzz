import { v } from "convex/values";
import { query } from "../../../_generated/server";
import { getCurrentUserWithWorkspace } from "../../users/utils";

export const getAll = query({
  args: {
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, { searchQuery }) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    const projectId = user?.currentProjectId;

    if (!user || !projectId) {
      throw new Error("Unauthorized");
    }

    const query = searchQuery
      ? ctx.db
          .query("audiences")
          .withSearchIndex("by_name", (q) => q.search("name", searchQuery))
          .take(15)
      : ctx.db
          .query("audiences")
          .withIndex("by_project_id", (q) => q.eq("projectId", projectId))
          .take(15);

    const audiences = await query;

    return audiences;
  },
});

export const getById = query({
  args: {
    id: v.id("audiences"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    const projectId = user?.currentProjectId;

    if (!user || !projectId) {
      throw new Error("Unauthorized");
    }

    const audience = await ctx.db.get(args.id);

    if (!audience) {
      throw new Error("Audience not found");
    }

    if (audience.projectId !== projectId) {
      throw new Error("Unauthorized");
    }

    return audience;
  },
});
