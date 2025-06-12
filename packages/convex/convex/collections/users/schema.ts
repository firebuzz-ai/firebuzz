import { type Infer, v } from "convex/values";

export const userSchema = v.object({
  externalId: v.string(),
  email: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  fullName: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  currentProjectId: v.optional(v.id("projects")),
  currentWorkspaceId: v.optional(v.id("workspaces")),
});

export type User = Infer<typeof userSchema>;
