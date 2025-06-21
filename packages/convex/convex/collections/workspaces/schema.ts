import { type Infer, v } from "convex/values";

export const workspaceSchema = v.object({
  externalId: v.optional(v.string()), // Clerk's Organization ID (For Teams)
  workspaceType: v.union(v.literal("personal"), v.literal("team")),
  ownerId: v.id("users"),
  title: v.string(),
  logo: v.optional(v.string()),
  // Stripe
  customerId: v.optional(v.string()), // Stripe Customer ID
  // Flags
  isOnboarded: v.boolean(),
  isSubscribed: v.boolean(), // Whether the workspace is subscribed to paid plan
});

export type WorkspaceType = "personal" | "team";
export type Workspace = Infer<typeof workspaceSchema>;
