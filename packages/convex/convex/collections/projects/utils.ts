import type { MutationCtx, QueryCtx } from "../../_generated/server";

export const checkSlug = async (ctx: QueryCtx | MutationCtx, slug: string) => {
  const project = await ctx.db
    .query("projects")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  return project === null;
};
