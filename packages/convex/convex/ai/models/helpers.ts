import type { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import type { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { anthropic } from "../../lib/anthropic";
import { openRouter } from "../../lib/openRouter";
import type { Model } from "./schema";

/* Context Window Sizes
Model	Context Window	Output Tokens
claude-sonnet-4.5	200K tokens	~64K tokens
gpt-5	400K tokens	~128K tokens
gpt-5-mini	400K tokens	~128K tokens
gemini-2.5-pro	1M tokens (2M coming)	Standard
google/gemini-2.5-flash	1M tokens	Standard
z-ai/glm-4.6	~128K tokens	Standard
x-ai/grok-code-fast-1	256K tokens	Standard
x-ai/grok-4-fast	256K tokens	Standard */

// Pricing per million tokens (updated 2025-10-10)
export const AI_MODELS_PRICING = {
	"claude-haiku-4.5": {
		inputPerMillion: 1,
		outputPerMillion: 5,
		cachedInputPerMillion: 0.1,
	},
	"claude-sonnet-4.5": {
		inputPerMillion: 3.0,
		outputPerMillion: 15.0,
		cachedInputPerMillion: 0.3,
	},
	"gpt-5": {
		inputPerMillion: 1.25,
		outputPerMillion: 10.0,
		cachedInputPerMillion: 0.125,
	},
	"gpt-5-codex": {
		inputPerMillion: 1.25,
		outputPerMillion: 10.0,
		cachedInputPerMillion: 0.125,
	},
	"gpt-5-mini": {
		inputPerMillion: 0.25,
		outputPerMillion: 2.0,
		cachedInputPerMillion: 0.025,
	},
	"gemini-2.5-pro": {
		inputPerMillion: 1.25,
		outputPerMillion: 10.0,
		cachedInputPerMillion: 0.31,
	},
	"gemini-2.5-flash": {
		inputPerMillion: 0.15,
		outputPerMillion: 0.6,
		cachedInputPerMillion: 0.03,
	},
	"glm-4.6": {
		inputPerMillion: 0.5,
		outputPerMillion: 2.2,
		cachedInputPerMillion: 0.11,
	},
	"grok-code-fast-1": {
		inputPerMillion: 0.2,
		outputPerMillion: 1.5,
		cachedInputPerMillion: 0.02,
	},
	"grok-4-fast": {
		inputPerMillion: 0.2,
		outputPerMillion: 0.5,
		cachedInputPerMillion: 0.05,
	},
} as const;

/**
 * Calculate the total cost for a given model and token usage
 * @param model - The AI model to calculate cost for
 * @param inputTokens - Total number of input tokens (includes cached tokens)
 * @param outputTokens - Number of output tokens used
 * @param cachedInputTokens - Number of cached input tokens (subset of inputTokens)
 * @returns Total cost in USD
 */
export function calculateModelCost(
	model: Model,
	inputTokens: number,
	outputTokens: number,
	cachedInputTokens = 0,
): number {
	const pricing = AI_MODELS_PRICING[model];

	// Subtract cached tokens from input tokens to avoid double counting
	const nonCachedInputTokens = inputTokens - cachedInputTokens;
	const inputCost =
		(nonCachedInputTokens / 1_000_000) * pricing.inputPerMillion;
	const cachedCost =
		(cachedInputTokens / 1_000_000) * pricing.cachedInputPerMillion;
	const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
	return inputCost + cachedCost + outputCost;
}

/**
 * Convert USD spend to credits ($0.05 = 1 credit)
 * Rounds up to 2 decimal places
 * @param totalSpend - Total spend in USD
 * @returns Number of credits consumed, rounded up to 2 decimal places
 */
export function calculateCreditsFromSpend(totalSpend: number): number {
	const credits = totalSpend / 0.05;
	return Math.ceil(credits * 100) / 100;
}

/**
 * Normalize a model string to one of our supported models
 * Maps model versions/variants to their base model name
 * @param modelString - Raw model string (e.g., "claude-sonnet-4.5-20250929")
 * @returns Normalized model name or undefined if not supported
 */
export function normalizeModel(modelString: string): Model {
	if (
		modelString.includes("claude-haiku-4.5") ||
		modelString.includes("claude-haiku-4-5-20251001")
	) {
		return "claude-haiku-4.5";
	}
	if (modelString.includes("claude-sonnet-4.5")) {
		return "claude-sonnet-4.5";
	}
	if (modelString.includes("gpt-5-mini")) {
		return "gpt-5-mini";
	}
	if (modelString.includes("gpt-5-codex")) {
		return "gpt-5-codex";
	}
	if (modelString.includes("gpt-5")) {
		return "gpt-5";
	}
	if (modelString.includes("gemini-2.5-pro")) {
		return "gemini-2.5-pro";
	}
	if (modelString.includes("gemini-2.5-flash")) {
		return "gemini-2.5-flash";
	}
	return "claude-sonnet-4.5";
}

export const openRouterSettings = {
	reasoning: {
		enabled: true,
		effort: "medium" as const,
	},
	usage: {
		include: true,
	}
};

export const getModel = (model: Model) => {
	switch (model) {
		/* OpenAI models */
		case "gpt-5":
			return openRouter.chat("openai/gpt-5", openRouterSettings);
		case "gpt-5-codex":
			return openRouter.chat("openai/gpt-5-codex", openRouterSettings);
		case "gpt-5-mini":
			return openRouter.chat("openai/gpt-5-mini", openRouterSettings);
		/* Google models */
		case "gemini-2.5-pro":
			return openRouter.chat("google/gemini-2.5-pro", openRouterSettings);
		case "gemini-2.5-flash":
			return openRouter.chat("google/gemini-2.5-flash", openRouterSettings);
		/* Anthropic models */
		case "claude-sonnet-4.5":
			return openRouter.chat("anthropic/claude-sonnet-4.5", openRouterSettings);
		case "claude-haiku-4.5":
			return anthropic.chat("claude-haiku-4-5-20251001");

		/* Default */
		default:
			return openRouter.chat("gemini-2.5-flash", openRouterSettings);
	}
};

export const getProviderOptions = (
	model: Model,
):
	| { anthropic: AnthropicProviderOptions }
	| { google: GoogleGenerativeAIProviderOptions }
	| { openai: OpenAIResponsesProviderOptions }
	| undefined => {
	switch (model) {
		/* Anthropic models */
		case "claude-sonnet-4.5":
		case "claude-haiku-4.5":
			return {
				anthropic: {
					thinking: { type: "enabled" as const, budgetTokens: 12000 },
					cacheControl: { type: "ephemeral", ttl: "5m" },
					sendReasoning: true,
				},
			};
		/* Google models */
		case "gemini-2.5-pro":
		case "gemini-2.5-flash":
			return {
				google: {
					responseModalities: ["TEXT"] as const,
					thinkingConfig: {
						thinkingBudget: 12000,
						includeThoughts: true,
					},
				},
			};
		/* OpenAI models */
		case "gpt-5":
		case "gpt-5-mini":
	}
};
