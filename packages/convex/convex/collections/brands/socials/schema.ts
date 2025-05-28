import { v } from "convex/values";

export const socialPlatformSchema = v.union(
	v.literal("facebook"),
	v.literal("instagram"),
	v.literal("twitter"),
	v.literal("linkedin"),
	v.literal("youtube"),
	v.literal("tiktok"),
	v.literal("pinterest"),
	v.literal("snapchat"),
	v.literal("reddit"),
	v.literal("discord"),
	v.literal("twitch"),
	v.literal("dribbble"),
	v.literal("github"),
	v.literal("gitlab"),
	v.literal("medium"),
	v.literal("devto"),
	v.literal("hashnode"),
	v.literal("stackoverflow"),
);

export const socialSchema = v.object({
	platform: socialPlatformSchema,
	handle: v.string(),
	url: v.string(),

	// Relations
	workspaceId: v.id("workspaces"),
	projectId: v.id("projects"),
	brandId: v.id("brands"),
	createdBy: v.id("users"),
	updatedBy: v.optional(v.id("users")),
	// Timestamps
	updatedAt: v.optional(v.string()),
});
