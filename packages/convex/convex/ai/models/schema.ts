import { type Infer, v } from "convex/values";

// Model Schema
export const modelSchema = v.union(
	v.literal("claude-sonnet-4.5"),
	v.literal("claude-haiku-4.5"),
	v.literal("gpt-5"),
	v.literal("gpt-5-mini"),
	v.literal("gpt-5-codex"),
	v.literal("gemini-2.5-pro"),
	v.literal("gemini-2.5-flash"),
);

export type Model = Infer<typeof modelSchema>;
