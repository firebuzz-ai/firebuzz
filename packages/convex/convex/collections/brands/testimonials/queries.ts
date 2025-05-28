import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "../../../_generated/server";
import { aggregateTestimonials } from "../../../aggregates";
import { getCurrentUser } from "../../users/utils";

export const getAll = query({
  args: {
    searchQuery: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { searchQuery, paginationOpts }) => {
    const user = await getCurrentUser(ctx);
    const projectId = user?.currentProject;

    if (!user || !projectId) {
      throw new Error("Unauthorized");
    }

    const query = searchQuery
      ? ctx.db
          .query("testimonials")
          .withSearchIndex("by_search_content", (q) =>
            q.search("searchContent", searchQuery)
          )
          .paginate(paginationOpts)
      : ctx.db
          .query("testimonials")
          .withIndex("by_project_id", (q) => q.eq("projectId", projectId))
          .paginate(paginationOpts);

    const testimonials = await query;

    return testimonials;
  },
});

export const getById = query({
  args: {
    id: v.id("testimonials"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const projectId = user?.currentProject;

    if (!user || !projectId) {
      throw new Error("Unauthorized");
    }

    const testimonial = await ctx.db.get(args.id);

    if (!testimonial) {
      throw new Error("Testimonial not found");
    }

    if (testimonial.projectId !== projectId) {
      throw new Error("Unauthorized");
    }

    return testimonial;
  },
});

export const getTotalCount = query({
  args: {
    brandId: v.id("brands"),
  },
  handler: async (ctx, args) => {
    return await aggregateTestimonials.count(ctx, {
      namespace: args.brandId,
      // @ts-ignore
      bounds: {},
    });
  },
});
