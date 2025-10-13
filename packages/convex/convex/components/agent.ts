import { openai } from "@ai-sdk/openai";
import {
	Agent,
	type StreamArgs,
	abortStream,
	listMessages,
	listStreams,
	saveMessage,
	syncStreams,
	toUIMessages,
	vStreamArgs,
} from "@convex-dev/agent";
import type { LanguageModel } from "ai";
import { ERROR_ANALYSIS_PROMPT } from "ai/prompts/landingError";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, type Infer, v } from "convex/values";
import { z } from "zod/v4";
import { components, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
	type ActionCtx,
	type QueryCtx,
	internalAction,
	mutation,
	query,
} from "../_generated/server";
import {
	calculateCreditsFromSpend,
	calculateModelCost,
	getModel,
	getProviderOptions,
	normalizeModel,
} from "../ai/models/helpers";
import { Model, modelSchema } from "../ai/models/schema";
import { LANDING_MAIN_PROMPT } from "../ai/prompts/landingMain";
import { Metadata, tools } from "../ai/tools/landingPage/index";
import { sandboxSchema } from "../collections/sandboxes/schema";
import { getCurrentUserWithWorkspace } from "../collections/users/utils";
import { ERRORS } from "../utils/errors";

export const landingPageErrorAnalysisSchema = z.object({
	errorType: z
		.string()
		.describe(
			"The type of error (e.g., Module Resolution Error, Type Error, Syntax Error)",
		),
	rootCause: z
		.string()
		.describe(
			"Explanation of why this error is happening. One sentence max. Very short.",
		),
	solution: z
		.string()
		.describe("Step-by-step instructions to fix the error. Very short."),
	filesToCheck: z
		.array(z.string())
		.describe(
			"List of specific files that likely need changes. Very short. Only file names and paths.",
		),
});

// AGENTS
export const landingPageErrorAnalysisAgent = new Agent(components.agent, {
	name: "landing-page-error-analysis",
	languageModel: openai.chat("gpt-4o-mini"),
	instructions: ERROR_ANALYSIS_PROMPT,
});

export async function createLandingPageRegularAgent(
	_ctx: ActionCtx,
	sessionId: Id<"agentSessions">,
	_knowledgeBases: Id<"knowledgeBases">[],
	sandbox: Doc<"sandboxes">,
	landingPageId: Id<"landingPages">,
	workspaceId: Id<"workspaces">,
	projectId: Id<"projects">,
	model: LanguageModel,
) {
	return new Agent<{
		workspaceId: Id<"workspaces">;
		projectId: Id<"projects">;
		campaignId: Id<"campaigns">;
	}>(components.agent, {
		name: "landing-page-regular",
		languageModel: model,
		instructions: LANDING_MAIN_PROMPT,
		usageHandler: async (ctx, args) => {
			const userId = args.userId;
			if (!userId) {
				return;
			}
			const model = normalizeModel(args.model);
			const provider = args.provider;
			const usage = args.usage;
			const inputTokens = usage.inputTokens || 0;
			const outputTokens =
				(usage.outputTokens || 0) + (usage.reasoningTokens || 0);
			const cachedInputTokens = usage.cachedInputTokens || 0;
			const calculateSpend = calculateModelCost(
				model,
				inputTokens,
				outputTokens,
				cachedInputTokens,
			);

			const calculateCredits = calculateCreditsFromSpend(calculateSpend);

			const timestampMs = Date.now();
			const randomHex = Math.floor(Math.random() * 0xffffff)
				.toString(16)
				.padStart(6, "0");
			const idempotencyKey = `${userId}:${sessionId}:${timestampMs}-${randomHex}`;

			// Send Usage to Transcations Table (Used for realtime credit tracking)
			await ctx.runMutation(
				internal.collections.stripe.transactions.mutations
					.addUsageIdempotentInternal,
				{
					amount: calculateCredits,
					idempotencyKey,
					workspaceId: workspaceId,
					projectId: projectId,
					userId: userId as Id<"users">,
					sessionId,
				},
			);

			// Send Usage to Token Usage (Synced with Tinybird asynchronously)
			await ctx.runMutation(
				internal.collections.tokenUsage.mutations.addTokenUsageInternal,
				{
					inputTokens: usage.inputTokens || 0,
					outputTokens: usage.outputTokens || 0,
					cachedInputTokens: usage.cachedInputTokens || 0,
					reasoningTokens: usage.reasoningTokens || 0,
					totalTokens: usage.totalTokens || 0,
					model,
					provider,
					cost: calculateSpend,
					workspaceId,
					projectId,
					sessionId,
					userId: userId as Id<"users">,
					outputType: "text",
				},
			);
		},
		contextOptions: {
			recentMessages: 10,
			// Options for searching messages via text and/or vector search.
			searchOptions: {
				limit: 10, // The maximum number of messages to fetch.
				messageRange: { before: 2, after: 1 },
			},
		},
		maxSteps: 40, // Alternative to stopWhen: stepCountIs(20)
		tools: tools(sandbox, landingPageId, sessionId),
	});
}

// ACTIONS
export const sendMessageToLandingPageRegularAgentActionInternal =
	internalAction({
		args: {
			threadId: v.string(),
			promptMessageId: v.string(),
			sessionId: v.id("agentSessions"),
			sandbox: v.object({
				...sandboxSchema.validator.fields,
				_id: v.id("sandboxes"),
				_creationTime: v.number(),
			}),
			landingPageId: v.id("landingPages"),
			model: modelSchema,
			knowledgeBases: v.array(v.id("knowledgeBases")),
			ignoreAutoFix: v.optional(v.boolean()),
			workspaceId: v.id("workspaces"),
			projectId: v.id("projects"),
			campaignId: v.id("campaigns"),
			userId: v.id("users"),
		},
		handler: async (
			ctx,
			{
				threadId,
				promptMessageId,
				sessionId,
				model,
				knowledgeBases,
				sandbox,
				landingPageId,
				ignoreAutoFix,
				workspaceId,
				projectId,
				campaignId,
				userId,
			},
		) => {
			const agentModel = getModel(model);
			const providerOptions = getProviderOptions(model);

			// Create Agent
			const agent = await createLandingPageRegularAgent(
				ctx,
				sessionId,
				knowledgeBases,
				sandbox,
				landingPageId,
				workspaceId,
				projectId,
				agentModel,
			);

			// Send Message
			const { thread } = await agent.continueThread(
				{ ...ctx, workspaceId, projectId, campaignId },
				{
					threadId,
					userId,
				},
			);

			const result = await thread.streamText(
				{
					promptMessageId,
					providerOptions,
				},
				{
					saveStreamDeltas: {
						chunking: "line",
						throttleMs: 250,
					},
				},
			);

			await result.consumeStream();

			if (!ignoreAutoFix) {
				console.log("Running AutoFix");
				// After stream finishes, check for errors to analyze and apply
				const session = await ctx.runQuery(
					internal.collections.agentSessions.queries.getByIdInternal,
					{ id: sessionId },
				);

				// Check if auto-error-fix is enabled
				if (session?.autoErrorFix && session.devServerErrors?.length > 0) {
					console.log("[AutoFix] Checking for errors...");

					const devServerErrors = session.devServerErrors || [];
					console.log(
						"[AutoFix] Total errors in session:",
						devServerErrors.length,
					);

					// Step 1: Analyze all errors
					const errorsToAnalyze = devServerErrors;

					console.log(
						`[AutoFix] Analyzing ${errorsToAnalyze.length} errors...`,
					);

					// Analyze all errors
					const { object: analysisResult } =
						await landingPageErrorAnalysisAgent.generateObject(
							ctx,
							{},
							{
								prompt: `Analyze the following errors: ${errorsToAnalyze.map((e) => e.errorMessage).join("\n")}`,
								schema: z.array(landingPageErrorAnalysisSchema),
							},
						);

					console.log("[AutoFix] Analysis complete");

					console.log("[AutoFix] Analysis result:", analysisResult);

					if (analysisResult?.length && analysisResult.length > 0) {
						// Combine all error solutions into a single message
						const errorCount = analysisResult.length;
						const solutionsText = analysisResult
							.map((error, index) => {
								return `### Error ${index + 1}\n\n${error.solution}`;
							})
							.join("\n\n---\n\n");

						// Format as tool-call style message for special rendering
						const fixPrompt = `<div data-error-fix="true" data-error-count="${errorCount}">

${solutionsText}

</div>`;

						// Step 2: Save the Message
						await saveMessage(ctx, components.agent, {
							threadId,
							userId,
							message: {
								role: "user",
								content: fixPrompt,
							},
						});

						// Step 2: Send Message
						const { thread: newThread } = await agent.continueThread(
							{ ...ctx, workspaceId, projectId, campaignId },
							{
								threadId,
								userId,
							},
						);

						// Step 3: Stream text
						const result = await newThread.streamText(
							{
								prompt: fixPrompt,
								providerOptions,
							},
							{
								saveStreamDeltas: {
									returnImmediately: true,
									throttleMs: 100,
								},
							},
						);

						await result.consumeStream();

						// Step 4: Remove applied errors from session after stream completes
						await ctx.runMutation(
							internal.collections.agentSessions.mutations
								.removeAppliedDevServerError,
							{ sessionId },
						);
					}
				}

				console.log("No errors found...");

				return "No errors found...";
			}
		},
	});

// MUTATIONS
export const sendMessageToLandingPageRegularAgent = mutation({
	args: {
		threadId: v.string(),
		prompt: v.string(),
		sessionId: v.id("agentSessions"),
		model: modelSchema,
		knowledgeBases: v.array(v.id("knowledgeBases")),
	},
	handler: async (
		ctx,
		{ threadId, prompt, sessionId, model, knowledgeBases },
	) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Get Session
		const session = await ctx.runQuery(
			internal.collections.agentSessions.queries.getByIdInternal,
			{ id: sessionId },
		);

		if (!session) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (session.status !== "active") {
			throw new ConvexError("Session is not active");
		}

		if (session.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		if (!session.sandboxId) {
			throw new ConvexError("Sandbox not found");
		}

		// Get Sandbox
		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: session.sandboxId },
		);

		if (!sandbox) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (sandbox.status !== "running") {
			throw new ConvexError("Sandbox is not running");
		}

		// Get landingPageId from session
		if (session.assetType !== "landingPage") {
			throw new ConvexError("Session is not for a landing page");
		}

		// Save the message
		const { messageId } = await saveMessage(ctx, components.agent, {
			threadId,
			userId: user._id,
			message: {
				role: "user",
				content: prompt,
			},
			agentName: "landing-page-regular",
		});

		// Send Message
		await ctx.scheduler.runAfter(
			0,
			internal.components.agent
				.sendMessageToLandingPageRegularAgentActionInternal,
			{
				threadId,
				promptMessageId: messageId,
				sessionId,
				sandbox,
				landingPageId: session.landingPageId,
				model,
				knowledgeBases,
				workspaceId: session.workspaceId,
				projectId: session.projectId,
				campaignId: session.campaignId,
				userId: user._id,
				ignoreAutoFix: false,
			},
		);
	},
});

export const abortStreamByStreamId = mutation({
	args: { threadId: v.string() },
	handler: async (ctx, { threadId }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const streams = await listStreams(ctx, components.agent, {
			threadId,
			includeStatuses: ["streaming"],
		});

		const activeStreams = streams.filter(
			(stream) => stream.status === "streaming",
		);

		if (activeStreams.length === 0) {
			console.log("No active streams found");
			return;
		}

		for (const stream of activeStreams) {
			console.log("Aborting stream", stream);
			await abortStream(ctx, components.agent, {
				reason: "Aborting via async call",
				streamId: stream.streamId,
			});
		}

		// Fail pending messages in the same transaction
		await ctx.runMutation(components.agent.messages.addMessages, {
			threadId,
			messages: [],
			failPendingSteps: true,
		});
	},
});

// QUERIES
export const listThreadUIMessages = async (
	ctx: QueryCtx,
	{
		threadId,
		paginationOpts,
		streamArgs,
	}: {
		threadId: string;
		paginationOpts: Infer<typeof paginationOptsValidator>;
		streamArgs: StreamArgs;
	},
) => {
	// Fetches the regular non-streaming messages.
	const paginated = await listMessages(ctx, components.agent, {
		threadId,
		paginationOpts,
	});

	const paginatedPagedWithMetadata = paginated.page.map((message) => {
		const model = message.model as Model | undefined;
		const rawUsage = message.usage;
		let credits = 0;
		let normalizedModel = model;
		if (rawUsage && model) {
			normalizedModel = normalizeModel(model);
			const promptTokens = rawUsage.promptTokens || 0;
			const completionTokens =
				(rawUsage.completionTokens || 0) + (rawUsage.reasoningTokens || 0);

			const cachedInputTokens = rawUsage.cachedInputTokens || 0;
			const usage = calculateModelCost(
				normalizedModel,
				promptTokens,
				completionTokens,
				cachedInputTokens,
			);
			credits = calculateCreditsFromSpend(usage);
		}
		return {
			...message,
			metadata: {
				userId: message.userId as Id<"users"> | undefined,
				usage: credits,
				error: message.error,
				model: normalizedModel,
				provider: message.provider,
			},
		};
	});

	const uiMessages = toUIMessages<Metadata>(paginatedPagedWithMetadata);

	const streams = await syncStreams(ctx, components.agent, {
		threadId,
		streamArgs,
	});

	return {
		page: uiMessages,
		continueCursor: paginated.continueCursor,
		isDone: paginated.isDone,
		streams,
	};
};

export const listThreadMessageDocs = async (
	ctx: QueryCtx,
	{
		threadId,
		paginationOpts,
	}: {
		threadId: string;
		paginationOpts: Infer<typeof paginationOptsValidator>;
	},
) => {
	return await listMessages(ctx, components.agent, {
		threadId,
		paginationOpts,
	});
};

export const listLandingPageMessages = query({
	args: {
		threadId: v.string(),
		paginationOpts: paginationOptsValidator,
		streamArgs: vStreamArgs,
		landingPageId: v.id("landingPages"),
	},
	handler: async (ctx, { landingPageId, paginationOpts, streamArgs }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const landingPage = await ctx.db.get(landingPageId);

		if (!landingPage) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (landingPage.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const threadId = landingPage.threadId;

		if (!threadId) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		return await listThreadUIMessages(ctx, {
			threadId,
			paginationOpts,
			streamArgs,
		});
	},
});

export const listLandingPageMessagesMetadata = query({
	args: {
		landingPageId: v.id("landingPages"),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, { landingPageId, paginationOpts }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const landingPage = await ctx.db.get(landingPageId);

		if (!landingPage) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (landingPage.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		if (!landingPage.threadId) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		return await listThreadMessageDocs(ctx, {
			threadId: landingPage.threadId,
			paginationOpts,
		});
	},
});
