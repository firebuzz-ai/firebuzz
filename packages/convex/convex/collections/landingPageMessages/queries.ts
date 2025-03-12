import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "../../_generated/server";

export const getPaginatedLandingPageMessages = query({
  args: {
    landingPageId: v.id("landingPages"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // First query with "desc" to get newest messages first for pagination
    const messages = await ctx.db
      .query("landingPageMessages")
      .withIndex("by_landing_page_id", (q) =>
        q.eq("landingPageId", args.landingPageId)
      )
      .order("desc") // Fetch newest messages first for pagination
      .paginate(args.paginationOpts);

    return {
      ...messages,
      // Keep the messages in chronological order (newest to oldest)
      // This preserves the intended conversation flow with proper User/Assistant sequence
      page: messages.page.sort((a, b) => b._creationTime - a._creationTime),
    };
  },
});
