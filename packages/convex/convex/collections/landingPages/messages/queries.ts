import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { query } from "../../../_generated/server";

export const getAll = query({
	args: {
		landingPageId: v.id("landingPages"),
	},
	handler: async (ctx, args) => {
		// First query with "desc" to get newest messages first for pagination
		const messages = await ctx.db
			.query("landingPageMessages")
			.withIndex("by_landing_page_id", (q) =>
				q.eq("landingPageId", args.landingPageId),
			)
			.collect();

		return messages;
	},
});

export const getPaginated = query({
	args: {
		landingPageId: v.id("landingPages"),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const paginatedMessages = await ctx.db
			.query("landingPageMessages")
			.withIndex("by_landing_page_id", (q) =>
				q.eq("landingPageId", args.landingPageId),
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
				{} as Record<string, typeof paginatedMessages.page>,
			);

		const sortedMessages = Object.values(groupedMessages).flatMap((messages) =>
			messages.sort(
				(a, b) =>
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
			),
		);

		// Get landing page versions
		const messsagesWithVersions = await asyncMap(
			sortedMessages,
			async (message) => {
				const landingPageVersion = await ctx.db
					.query("landingPageVersions")
					.withIndex("by_message_id", (q) =>
						q.eq("messageId", message.messageId),
					)
					.first();

				return {
					...message,
					landingPageVersionId: landingPageVersion?._id,
					landingPageVersionNumber: landingPageVersion?.number,
				};
			},
		);

		return {
			...paginatedMessages,
			page: messsagesWithVersions,
		};
	},
});
