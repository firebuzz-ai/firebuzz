import { internalMutation } from "_generated/server";
import { tokenUsageSchema } from "./schema";

export const addTokenUsageInternal = internalMutation({
	args: tokenUsageSchema.validator.fields,
	handler: async (ctx, args) => {
		const {
			inputTokens,
			cachedInputTokens,
			outputTokens,
			reasoningTokens,
			totalTokens,
			model,
			provider,
			cost,
			outputType,
			sessionId,
			workspaceId,
			projectId,
			userId,
		} = args;

		const tokenUsage = await ctx.db.insert("tokenUsage", {
			inputTokens,
			cachedInputTokens,
			outputTokens,
			reasoningTokens,
			totalTokens,
			model,
			provider,
			cost,
			outputType,
			sessionId,
			workspaceId,
			projectId,
			userId,
		});

		return tokenUsage;
	},
});
