import {
	AnthropicIcon,
	GeminiIcon,
	OpenAIIcon,
} from "@firebuzz/ui/icons/ai-providers";

export const MODEL_CONFIG = {
	"claude-haiku-4.5": {
		name: "Claude Haiku 4.5",
		provider: "Anthropic",
		icon: AnthropicIcon,
	},
	"claude-sonnet-4.5": {
		name: "Claude Sonnet 4.5",
		provider: "Anthropic",
		icon: AnthropicIcon,
	},
	"gpt-5-codex": {
		name: "GPT-5 Codex",
		provider: "OpenAI",
		icon: OpenAIIcon,
	},
	"gpt-5": {
		name: "GPT-5",
		provider: "OpenAI",
		icon: OpenAIIcon,
	},
	"gpt-5-mini": {
		name: "GPT-5 Mini",
		provider: "OpenAI",
		icon: OpenAIIcon,
	},
	"gemini-2.5-pro": {
		name: "Gemini 2.5 Pro",
		provider: "Google",
		icon: GeminiIcon,
	},
	"gemini-2.5-flash": {
		name: "Gemini 2.5 Flash",
		provider: "Google",
		icon: GeminiIcon,
	},
} as const;
