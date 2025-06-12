import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "../../../_generated/server";
import { getCurrentUserWithWorkspace } from "../../users/utils";

export const getPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { paginationOpts }) => {
    // Make sure the user is authenticated
    await getCurrentUserWithWorkspace(ctx);

    // Get all templates with pagination
    const templates = await ctx.db
      .query("landingPageTemplates")
      .paginate(paginationOpts);

    return templates;
  },
});

export const getById = query({
  args: {
    id: v.id("landingPageTemplates"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
