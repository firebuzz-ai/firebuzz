import { type Infer, v } from "convex/values";

export const workspaceSchema = v.object({
  externalId: v.string(), // Clerk's Organization ID or User ID
  workspaceType: v.union(v.literal("personal"), v.literal("team")),
  ownerId: v.id("users"),
  title: v.string(),
  color: v.string(),
  icon: v.string(),
  onboardingCompleted: v.boolean(),
});

export type WorkspaceType = "personal" | "team";
export type Workspace = Infer<typeof workspaceSchema>;
