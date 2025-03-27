import { type Infer, v } from "convex/values";

export const landingPageVersionsSchema = v.object({
	number: v.number(),
	messageId: v.optional(v.string()),
	key: v.optional(v.string()),
	// Relations
	createdBy: v.id("users"),
	workspaceId: v.id("workspaces"),
	projectId: v.id("projects"),
	campaignId: v.id("campaigns"),
	landingPageId: v.id("landingPages"),
});

export type LandingPageVersion = Infer<typeof landingPageVersionsSchema>;
