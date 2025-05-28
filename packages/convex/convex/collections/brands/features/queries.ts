import { v } from "convex/values";
import { query } from "../../../_generated/server";
import { getCurrentUser } from "../../users/utils";

export const getAll = query({
	args: {},
	handler: async (ctx) => {
		const user = await getCurrentUser(ctx);
		const projectId = user?.currentProject;

		if (!user || !projectId) {
			throw new Error("Unauthorized");
		}

		const features = await ctx.db
			.query("features")
			.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
			.take(15);

		return features;
	},
});

export const getById = query({
	args: {
		id: v.id("features"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		const projectId = user?.currentProject;

		if (!user || !projectId) {
			throw new Error("Unauthorized");
		}

		const feature = await ctx.db.get(args.id);

		if (!feature) {
			throw new Error("Feature not found");
		}

		if (feature.projectId !== projectId) {
			throw new Error("Unauthorized");
		}

		return feature;
	},
});
