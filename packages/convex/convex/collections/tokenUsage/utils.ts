import { internal } from "_generated/api";
import { internalMutation } from "_generated/server";
import { retrier } from "components/actionRetrier";
import { cascadePool } from "components/workpools";
import { v } from "convex/values";

// Sync session token usage to Tinybird
export const batchAggregateAndSyncWithTinybird = internalMutation({
	args: {
		cursor: v.optional(v.string()),
		sessionId: v.id("agentSessions"),
		numItems: v.number(),
	},
	handler: async (ctx, { sessionId, cursor, numItems }) => {
		const { page, continueCursor } = await ctx.db
			.query("tokenUsage")
			.withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
			.paginate({ numItems, cursor: cursor ?? null });

		if (page.length === 0) {
			return;
		}

		const tokenUsages = page.map((tokenUsage) => ({
			inputTokens: tokenUsage.inputTokens,
			cachedInputTokens: tokenUsage.cachedInputTokens,
			outputTokens: tokenUsage.outputTokens,
			reasoningTokens: tokenUsage.reasoningTokens,
			totalTokens: tokenUsage.totalTokens,
			model: tokenUsage.model,
			provider: tokenUsage.provider,
			cost: tokenUsage.cost,
			outputType: tokenUsage.outputType,
			sessionId: tokenUsage.sessionId,
			workspaceId: tokenUsage.workspaceId,
			userId: tokenUsage.userId,
			projectId: tokenUsage.projectId,
			createdAt: new Date(tokenUsage._creationTime).toISOString(),
		}));

		// Check ratelimit for ingestCreditUsage
		const { ok, retryAfter } = await ctx.runQuery(
			internal.components.ratelimits.checkLimit,
			{
				name: "ingestTokenUsage",
			},
		);

		await retrier.runAfter(
			ctx,
			ok ? 0 : retryAfter,
			internal.lib.tinybird.batchIngestTokenUsageAction,
			{
				tokenUsages,
			},
		);

		if (
			continueCursor &&
			continueCursor !== cursor &&
			page.length === numItems
		) {
			await cascadePool.enqueueMutation(
				ctx,
				internal.collections.tokenUsage.utils.batchAggregateAndSyncWithTinybird,
				{ sessionId, cursor: continueCursor, numItems },
			);
		}
	},
});
