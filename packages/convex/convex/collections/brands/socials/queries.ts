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

		const queryBuilder = searchQuery
			? ctx.db
					.query("socials")
					.withSearchIndex("by_platform", (q) =>
						q.search("platform", searchQuery),
					)
					.take(15)
			: ctx.db
					.query("socials")
					.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
					.take(15);

		const socials = await queryBuilder;

		return socials;
	},
});

export const getById = query({
	args: {
		id: v.id("socials"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const projectId = user?.currentProjectId;

		if (!user || !projectId) {
			throw new Error("Unauthorized");
		}

		const social = await ctx.db.get(args.id);

		if (!social) {
			throw new Error("Social not found");
		}

		if (social.projectId !== projectId) {
			throw new Error("Unauthorized");
		}

		return social;
	},
});
