import {
	AnthropicIcon,
	GeminiIcon,
	OpenAIIcon,
	XaiIcon,
	ZaiIcon,
} from "@firebuzz/ui/icons/ai-providers";

export const MODEL_CONFIG = {
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
	"glm-4.6": {
		name: "GLM 4.6",
		provider: "Z.ai",
		icon: ZaiIcon,
	},
	"grok-code-fast-1": {
		name: "Grok Code Fast 1",
		provider: "X.ai",
		icon: XaiIcon,
	},
	"grok-4-fast": {
		name: "Grok 4 Fast",
		provider: "X.ai",
		icon: XaiIcon,
	},
} as const;
