import { v } from "convex/values";
import { internalMutation } from "../../../../_generated/server";

export const createInternal = internalMutation({
	args: {
		mediaId: v.id("media"),
		projectId: v.id("projects"),
		workspaceId: v.id("workspaces"),
		embedding: v.array(v.float64()),
	},
	handler: async (ctx, args) => {
		const { mediaId, projectId, workspaceId, embedding } = args;

		const key = await ctx.db.insert("mediaVectors", {
			mediaId,
			projectId,
			workspaceId,
			embedding,
		});

		return key;
	},
});

export const deleteByMediaIdInternal = internalMutation({
	args: {
		mediaId: v.id("media"),
	},
	handler: async (ctx, args) => {
		const { mediaId } = args;

		const vector = await ctx.db
			.query("mediaVectors")
			.withIndex("by_media_id", (q) => q.eq("mediaId", mediaId))
			.first();

		if (vector) {
			await ctx.db.delete(vector._id);
		}
	},
});
