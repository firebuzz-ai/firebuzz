import { v } from "convex/values";
import { query } from "../../../_generated/server";
import { getCurrentUserWithWorkspace } from "../../users/utils";

export const getAll = query({
	args: {
		showHidden: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const projectId = user?.currentProjectId;

		if (!user || !projectId) {
			throw new Error("Unauthorized");
		}

		const themes = await ctx.db
			.query("themes")
			.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
			.filter((q) =>
				args.showHidden ? true : q.eq(q.field("isVisible"), true),
			)
			.take(10);

		return themes.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
	},
});

export const getById = query({
	args: {
		id: v.id("themes"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		if (!user) {
			throw new Error("Unauthorized");
		}

		const projectId = user.currentProjectId;

		const theme = await ctx.db.get(args.id);

		if (!theme) {
			throw new Error("Theme not found");
		}

		if (theme.projectId !== projectId) {
			throw new Error("Unauthorized");
		}

		return theme;
	},
});
