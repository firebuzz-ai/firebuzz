import { type Infer, v } from "convex/values";

// Model Schema
export const modelSchema = v.union(
	v.literal("claude-sonnet-4.5"),
	v.literal("gpt-5"),
	v.literal("gpt-5-mini"),
	v.literal("gemini-2.5-pro"),
	v.literal("google/gemini-2.5-flash"),
	v.literal("z-ai/glm-4.6"),
	v.literal("x-ai/grok-code-fast-1"),
	v.literal("x-ai/grok-4-fast"),
);

export type Model = Infer<typeof modelSchema>;
