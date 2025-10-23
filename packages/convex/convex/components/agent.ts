import {
	Agent,
	type StreamArgs,
	abortStream,
	createThread,
	listMessages,
	listStreams,
	saveMessage,
	syncStreams,
	toUIMessages,
	vStreamArgs,
} from "@convex-dev/agent";
import type { GenerateObjectResult, LanguageModel } from "ai";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, type Infer, v } from "convex/values";
import { z } from "zod/v4";
import { components, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
	type ActionCtx,
	type QueryCtx,
	action,
	internalAction,
	internalMutation,
	mutation,
	query,
} from "../_generated/server";
import {
	calculateCreditsFromSpend,
	calculateModelCost,
	getModel,
	normalizeModel,
	openRouterSettings,
} from "../ai/models/helpers";
import { type Model, modelSchema } from "../ai/models/schema";
import { FORM_SCHEMA_GENERATION_PROMPT } from "../ai/prompts/formSchema";
import { ERROR_ANALYSIS_PROMPT } from "../ai/prompts/landingError";
import { LANDING_MAIN_PROMPT } from "../ai/prompts/landingMain";
import {
	type FormSchemaResponse,
	formSchemaResponse,
} from "../ai/schemas/formSchema";
import { type Metadata, tools } from "../ai/tools/landingPage/index";
import { sandboxSchema } from "../collections/sandboxes/schema";
import { getCurrentUserWithWorkspace } from "../collections/users/utils";
import { openRouter } from "../lib/openRouter";
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
	languageModel: openRouter.chat("google/gemini-2.5-flash", openRouterSettings),
	instructions: ERROR_ANALYSIS_PROMPT,
});

export const formSchemaGenerationAgent = new Agent(components.agent, {
	name: "form-schema-generation",
	languageModel: openRouter.chat("google/gemini-2.5-flash", openRouterSettings),
	instructions: FORM_SCHEMA_GENERATION_PROMPT,
});

export async function createLandingPageRegularAgent(
	_ctx: ActionCtx,
	sessionId: Id<"agentSessions">,
	_knowledgeBases: Id<"knowledgeBases">[],
	sandbox: Doc<"sandboxes">,
	landingPageId: Id<"landingPages">,
	workspaceId: Id<"workspaces">,
	projectId: Id<"projects">,
	userId: Id<"users">,
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
			// Options for searching messages via text and/or vector search.
			searchOptions: {
				limit: 10, // The maximum number of messages to fetch.
				messageRange: { before: 2, after: 1 },
			},
		},
		maxSteps: 100, // Alternative to stopWhen: stepCountIs(20)
		tools: tools(
			sandbox,
			landingPageId,
			sessionId,
			workspaceId,
			userId,
			projectId,
		),
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
				/* ignoreAutoFix, */
				workspaceId,
				projectId,
				campaignId,
				userId,
			},
		) => {
			const agentModel = getModel(model);
			/* const providerOptions = getProviderOptions(model); */

			// Create Agent
			const agent = await createLandingPageRegularAgent(
				ctx,
				sessionId,
				knowledgeBases,
				sandbox,
				landingPageId,
				workspaceId,
				projectId,
				userId,
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
					providerOptions: {
						anthropic: {
							thinking: { type: "enabled", budgetTokens: 12000 },
							cacheControl: { type: "ephemeral", ttl: "5m" },
							sendReasoning: true,
						},
					},
				},
				{
					saveStreamDeltas: {
						/* chunking: "line", */
						throttleMs: 250,
					},
				},
			);

			await result.consumeStream();

			// Streaming Finished (Check if there are any queued messages)
			const sessionAfterStream = await ctx.runQuery(
				internal.collections.agentSessions.queries.getByIdInternal,
				{ id: sessionId },
			);

			if (
				sessionAfterStream?.messageQueue &&
				sessionAfterStream.messageQueue.length > 0
			) {
				console.log(
					`[Queue] Stream finished, processing next of ${sessionAfterStream.messageQueue.length} queued messages`,
				);
				// Schedule processing the next queued message
				await ctx.scheduler.runAfter(
					0,
					internal.collections.agentSessions.mutations
						.processNextQueuedMessageInternal,
					{ sessionId },
				);
			}
		},
	});

// MUTATIONS
/**
 * Internal mutation to send message to agent (used for queue processing)
 * Does not check user auth, takes attachments as parameter instead of from session
 */
export const sendMessageToLandingPageRegularAgentInternal = internalMutation({
	args: {
		threadId: v.string(),
		prompt: v.string(),
		sessionId: v.id("agentSessions"),
		model: modelSchema,
		knowledgeBases: v.array(v.id("knowledgeBases")),
		userId: v.id("users"),
		attachments: v.array(
			v.union(
				v.object({ type: v.literal("media"), id: v.id("media") }),
				v.object({ type: v.literal("document"), id: v.id("documents") }),
			),
		),
	},
	handler: async (
		ctx,
		{ threadId, prompt, sessionId, model, knowledgeBases, userId, attachments },
	) => {
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

		// Build message content from attachments passed as parameter
		let messageContent:
			| string
			| Array<
					| { type: "text"; text: string }
					| { type: "image"; image: string; mimeType?: string }
					| { type: "file"; data: string; mimeType: string }
			  > = prompt;

		if (attachments && attachments.length > 0) {
			const contentParts: Array<
				| { type: "text"; text: string }
				| {
						type: "image";
						image: string;
						mimeType?: string;
				  }
				| {
						type: "file";
						data: string;
						mimeType: string;
				  }
			> = [];

			// Add the user's prompt first
			contentParts.push({
				type: "text" as const,
				text: prompt,
			});

			// Fetch and format attachments
			for (const attachment of attachments) {
				if (attachment.type === "media") {
					const media = await ctx.db.get(attachment.id);
					if (media) {
						const cdnUrl = `${process.env.R2_PUBLIC_URL}/${media.key}`;

						// Add the image
						contentParts.push({
							type: "image" as const,
							image: cdnUrl,
							mimeType: media.contentType,
						});

						// Add CDN URL right after the image (hidden in UI, visible to agent)
						const urlDiv = `<div data-hidden-from-ui="true" data-image-cdn-url="${cdnUrl}">${cdnUrl}</div>`;
						contentParts.push({
							type: "text" as const,
							text: urlDiv,
						});

						console.log("[Agent] Added CDN URL after image:", cdnUrl);
					}
				} else if (attachment.type === "document") {
					const document = await ctx.db.get(attachment.id);
					if (document) {
						const url = `${process.env.R2_PUBLIC_URL}/${document.key}`;
						const mimeType = document.contentType;

						// AI models can read PDFs and some other formats natively
						const nativelyReadableTypes = [
							"application/pdf",
							"text/plain",
							"text/markdown",
							"text/csv",
							"text/html",
						];

						if (nativelyReadableTypes.includes(mimeType)) {
							console.log("Sending file as data", url, mimeType);
							contentParts.push({
								type: "file" as const,
								data: url,
								mimeType: mimeType,
							});
						} else {
							// For other document types, send as text reference
							contentParts.push({
								type: "text" as const,
								text: `[Document: ${document.name}]\nURL: ${url}`,
							});
						}
					}
				}
			}

			messageContent = contentParts;
		}

		// Save the message
		const { messageId } = await saveMessage(ctx, components.agent, {
			threadId,
			userId,
			message: {
				role: "user",
				content: messageContent,
			},
			agentName: "landing-page-regular",
		});

		// Send heartbeat to keep session alive
		await ctx.scheduler.runAfter(
			0,
			internal.collections.agentSessions.actions.sendHeartbeatToAgentSession,
			{ sessionId },
		);

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
				userId,
			},
		);
	},
});

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

		// Fetch attachments from session and format them
		let messageContent:
			| string
			| Array<
					| { type: "text"; text: string }
					| { type: "image"; image: string; mimeType?: string }
					| { type: "file"; data: string; mimeType: string }
			  > = prompt;

		if (session.attachments && session.attachments.length > 0) {
			const contentParts: Array<
				| { type: "text"; text: string }
				| {
						type: "image";
						image: string;
						mimeType?: string;
				  }
				| {
						type: "file";
						data: string;
						mimeType: string;
				  }
			> = [];

			// Add the user's prompt first
			contentParts.push({
				type: "text" as const,
				text: prompt,
			});

			// Fetch and format attachments
			for (const attachment of session.attachments) {
				if (attachment.type === "media") {
					const media = await ctx.db.get(attachment.id);
					if (media) {
						const cdnUrl = `${process.env.R2_PUBLIC_URL}/${media.key}`;

						// Add the image
						contentParts.push({
							type: "image" as const,
							image: cdnUrl,
							mimeType: media.contentType,
						});

						// Add CDN URL right after the image (hidden in UI, visible to agent)
						const urlDiv = `<div data-hidden-from-ui="true" data-image-cdn-url="${cdnUrl}">${cdnUrl}</div>`;
						contentParts.push({
							type: "text" as const,
							text: urlDiv,
						});

						console.log("[Agent] Added CDN URL after image:", cdnUrl);
					}
				} else if (attachment.type === "document") {
					const document = await ctx.db.get(attachment.id);
					if (document) {
						const url = `${process.env.R2_PUBLIC_URL}/${document.key}`;
						const mimeType = document.contentType;

						// AI models can read PDFs and some other formats natively
						const nativelyReadableTypes = [
							"application/pdf",
							"text/plain",
							"text/markdown",
							"text/csv",
							"text/html",
						];

						if (nativelyReadableTypes.includes(mimeType)) {
							console.log("Sending file as data", url, mimeType);
							contentParts.push({
								type: "file" as const,
								data: url,
								mimeType: mimeType,
							});
						} else {
							// For other document types, send as text reference
							contentParts.push({
								type: "text" as const,
								text: `[Document: ${document.name}]\nURL: ${url}`,
							});
						}
					}
				}
			}

			messageContent = contentParts;
		}

		// Save the message
		const { messageId } = await saveMessage(ctx, components.agent, {
			threadId,
			userId: user._id,
			message: {
				role: "user",
				content: messageContent,
			},
			agentName: "landing-page-regular",
		});

		// Clear attachments after sending message
		if (session.attachments && session.attachments.length > 0) {
			await ctx.db.patch(sessionId, {
				attachments: [],
				updatedAt: new Date().toISOString(),
			});
		}

		// Send heartbeat to keep session alive
		await ctx.scheduler.runAfter(
			0,
			internal.collections.agentSessions.actions.sendHeartbeatToAgentSession,
			{ sessionId },
		);

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

	// Group messages by order to aggregate usage across message parts
	const messagesByOrder = new Map<number, typeof paginated.page>();
	for (const message of paginated.page) {
		if (!messagesByOrder.has(message.order)) {
			messagesByOrder.set(message.order, []);
		}
		messagesByOrder.get(message.order)?.push(message);
	}

	// Calculate aggregated usage for each order group (user message + all assistant parts)
	const aggregatedUsage = new Map<string, number>();
	for (const [_order, messages] of messagesByOrder.entries()) {
		// Only aggregate for assistant/tool messages (skip user messages)
		const assistantMessages = messages.filter((m) => {
			const role = m.message?.role;
			return role === "assistant" || role === "tool";
		});

		if (assistantMessages.length === 0) continue;

		let totalCredits = 0;

		for (const message of assistantMessages) {
			const model = message.model as Model | undefined;
			const rawUsage = message.usage;

			if (rawUsage && model) {
				const normalizedModel = normalizeModel(model);
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
				totalCredits += calculateCreditsFromSpend(usage);
			}
		}

		if (totalCredits > 0) {
			// Store aggregated usage on the last assistant message in the group
			const lastMessage = assistantMessages[assistantMessages.length - 1];
			aggregatedUsage.set(lastMessage._id, totalCredits);
		}
	}

	const paginatedPagedWithMetadata = paginated.page.map((message) => {
		const model = message.model as Model | undefined;
		const normalizedModel = model ? normalizeModel(model) : undefined;

		// Only attach usage if this is the last message in its order group
		const credits = aggregatedUsage.get(message._id) || 0;

		return {
			...message,
			metadata: {
				userId: message.userId as Id<"users"> | undefined,
				usage: Number(credits.toFixed(2)),
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

export const listLandingPageMessages = query({
	args: {
		threadId: v.string(),
		paginationOpts: paginationOptsValidator,
		streamArgs: vStreamArgs,
	},
	handler: async (ctx, { threadId, paginationOpts, streamArgs }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		return await listThreadUIMessages(ctx, {
			threadId,
			paginationOpts,
			streamArgs,
		});
	},
});

export const clearThreadAndCreateNew = mutation({
	args: {
		landingPageId: v.id("landingPages"),
	},
	handler: async (ctx, { landingPageId }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Get landing page
		const landingPage = await ctx.db.get(landingPageId);

		if (!landingPage) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (landingPage.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		if (!landingPage.threadId) {
			throw new ConvexError("Landing page has no thread");
		}

		const oldThreadId = landingPage.threadId;

		// Create new thread
		const newThreadId = await createThread(ctx, components.agent, {
			userId: user._id,
			title: landingPage.title,
		});

		// Update landing page with new thread
		await ctx.db.patch(landingPageId, {
			threadId: newThreadId,
			updatedAt: Date.now(),
		});

		// Delete old thread asynchronously
		await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, {
			threadId: oldThreadId,
		});

		return newThreadId;
	},
});

// FORM SCHEMA GENERATION
export const generateFormSchema = action({
	args: {
		campaignId: v.id("campaigns"),
		prompt: v.string(),
		existingSchema: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		const user = await ctx.runQuery(
			internal.collections.users.queries.getCurrentUserInternal,
		);

		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Build the full prompt with existing schema if provided
		const existingSchemaText =
			args.existingSchema &&
			Array.isArray(args.existingSchema) &&
			args.existingSchema.length > 0
				? `\n\nExisting form schema to modify:\n${JSON.stringify(args.existingSchema, null, 2)}`
				: "";

		const fullPrompt = `User prompt: ${args.prompt}${existingSchemaText}`;

		try {
			const response: GenerateObjectResult<FormSchemaResponse> =
				await formSchemaGenerationAgent.generateObject(
					ctx,
					{
						userId: user._id,
					},
					{
						prompt: fullPrompt,
						schema: formSchemaResponse,
					},
				);

			return response.object;
		} catch (error) {
			console.error("Error generating form schema", error);
			throw new ConvexError(ERRORS.SOMETHING_WENT_WRONG);
		}
	},
});
