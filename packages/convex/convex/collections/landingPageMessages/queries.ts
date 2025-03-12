import { v } from "convex/values";
import { query } from "../../_generated/server";

export const getLandingPageMessages = query({
  args: {
    landingPageId: v.id("landingPages"),
  },
  handler: async (ctx, args) => {
    // First query with "desc" to get newest messages first for pagination
    const messages = await ctx.db
      .query("landingPageMessages")
      .withIndex("by_landing_page_id", (q) =>
        q.eq("landingPageId", args.landingPageId)
      )
      .collect();

    return messages;
  },
});
