import { v } from "convex/values";
import { mutationWithTrigger } from "../../../triggers";
import { getCurrentUser } from "../../users/utils";

export const create = mutationWithTrigger({
	args: {
		name: v.string(),
		description: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);

		if (!user || !user.currentWorkspaceId || !user.currentProject) {
			throw new Error("Unauthorized");
		}

		const knowledgeBase = await ctx.db.insert("knowledgeBases", {
			name: args.name,
			description: args.description,
			createdBy: user._id,
			workspaceId: user.currentWorkspaceId,
			projectId: user.currentProject,
		});

		return knowledgeBase;
	},
});
