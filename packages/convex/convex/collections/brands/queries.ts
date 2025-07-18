import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { query } from "../../_generated/server";
import { getCurrentUserWithWorkspace } from "../users/utils";

export const getCurrent = query({
	args: {},
	handler: async (ctx) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const currentProjectId = user?.currentProjectId;

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
		const user = await getCurrentUserWithWorkspace(ctx);
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

export const getMarketingData = query({
	args: {
		dataType: v.union(
			v.literal("audiences"),
			v.literal("testimonials"),
			v.literal("socials"),
			v.literal("features"),
		),
		paginationOpts: paginationOptsValidator,
		searchQuery: v.optional(v.string()),
	},
	handler: async (ctx, { dataType, paginationOpts, searchQuery }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const projectId = user?.currentProjectId;

		if (!user || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		switch (dataType) {
			case "audiences": {
				const query = searchQuery
					? ctx.db
							.query("audiences")
							.withSearchIndex("by_name", (q) => q.search("name", searchQuery))
							.paginate(paginationOpts)
					: ctx.db
							.query("audiences")
							.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
							.paginate(paginationOpts);

				return await query;
			}
			case "testimonials": {
				const query = searchQuery
					? ctx.db
							.query("testimonials")
							.withSearchIndex("by_search_content", (q) =>
								q.search("searchContent", searchQuery),
							)
							.paginate(paginationOpts)
					: ctx.db
							.query("testimonials")
							.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
							.paginate(paginationOpts);

				return await query;
			}
			case "socials": {
				const query = searchQuery
					? ctx.db
							.query("socials")
							.withSearchIndex("by_platform", (q) =>
								q.search("platform", searchQuery),
							)
							.paginate(paginationOpts)
					: ctx.db
							.query("socials")
							.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
							.paginate(paginationOpts);

				return await query;
			}
			case "features": {
				const query = ctx.db
					.query("features")
					.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
					.paginate(paginationOpts);

				return await query;
			}
			default:
				throw new ConvexError("Invalid data type");
		}
	},
});
