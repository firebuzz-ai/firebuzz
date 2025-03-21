import { paginationOptsValidator } from "convex/server";
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

export const getPaginatedLandingPageMessages = query({
  args: {
    landingPageId: v.id("landingPages"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const paginatedMessages = await ctx.db
      .query("landingPageMessages")
      .withIndex("by_landing_page_id", (q) =>
        q.eq("landingPageId", args.landingPageId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // Group messages, sort by createdAt, and return as an array
    const groupedMessages = paginatedMessages.page
      .sort((a, b) => b._creationTime - a._creationTime)
      .reduce(
        (acc, message) => {
          if (!acc[message.groupId]) {
            acc[message.groupId] = [];
          }
          acc[message.groupId].push(message);
          return acc;
        },
        {} as Record<string, typeof paginatedMessages.page>
      );

    const sortedMessages = Object.values(groupedMessages).flatMap((messages) =>
      messages.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    );

    return {
      ...paginatedMessages,
      page: sortedMessages,
    };
  },
});
