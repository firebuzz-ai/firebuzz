import { type Infer, v } from "convex/values";

export const attachmentsSchema = v.object({
  name: v.string(),
  url: v.string(),
  contentType: v.string(),
  size: v.number(),
});

export const landingPageMessagesSchema = v.object({
  messageId: v.string(),
  groupId: v.string(),
  role: v.union(v.literal("user"), v.literal("assistant")),
  vote: v.optional(v.union(v.literal("up"), v.literal("down"))),
  createdAt: v.string(),
  parts: v.array(v.any()),
  attachments: v.optional(v.array(attachmentsSchema)),
  // Relations
  landingPageId: v.id("landingPages"),
  workspaceId: v.id("workspaces"),
  projectId: v.id("projects"),
  campaignId: v.id("campaigns"),
});

export type LandingPageMessageRole = "user" | "assistant";
export type LandingPageMessageVote = "up" | "down";
export type LandingPageMessage = Infer<typeof landingPageMessagesSchema>;
export type Attachment = Infer<typeof attachmentsSchema>;
