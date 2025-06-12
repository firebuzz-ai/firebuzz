import { v } from "convex/values";

export const projectSchema = v.object({
  title: v.string(),
  color: v.string(),
  icon: v.string(),
  // Relations
  workspaceId: v.id("workspaces"),
  createdBy: v.id("users"),
  // Flags
  isOnboarded: v.optional(v.boolean()),
});
