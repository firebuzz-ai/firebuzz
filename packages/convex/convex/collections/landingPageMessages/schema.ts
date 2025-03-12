import { type Infer, v } from "convex/values";

export const landingPageMessagesSchema = v.object({
  message: v.string(),
  role: v.union(v.literal("user"), v.literal("assistant")),
  vote: v.optional(v.union(v.literal("up"), v.literal("down"))),
  // Relations
  landingPageId: v.id("landingPages"),
  landingPageVersionId: v.optional(v.id("landingPageVersions")),
  workspaceId: v.id("workspaces"),
  projectId: v.id("projects"),
  campaignId: v.id("campaigns"),
});

export type LandingPageMessageRole = "user" | "assistant";
export type LandingPageMessageVote = "up" | "down";
export type LandingPageMessage = Infer<typeof landingPageMessagesSchema>;
