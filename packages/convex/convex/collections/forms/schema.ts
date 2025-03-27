import { v } from "convex/values";

export const formSchema = v.object({
  // Relations
  workspaceId: v.id("workspaces"),
  projectId: v.id("projects"),
  campaignId: v.id("campaigns"),
  createdBy: v.id("users"),
  schema: v.array(
    v.object({
      title: v.string(),
      type: v.union(
        v.literal("string"),
        v.literal("number"),
        v.literal("boolean")
      ),
      inputType: v.union(
        v.literal("text"),
        v.literal("number"),
        v.literal("checkbox"),
        v.literal("select"),
        v.literal("textarea"),
        v.literal("date"),
        v.literal("time"),
        v.literal("email"),
        v.literal("url"),
        v.literal("tel"),
        v.literal("password"),
        v.literal("color")
      ),
      required: v.boolean(),
      default: v.optional(v.union(v.string(), v.number(), v.boolean())),
      options: v.optional(
        v.array(v.union(v.string(), v.number(), v.boolean()))
      ),
    })
  ),
  updatedAt: v.number(),
});
