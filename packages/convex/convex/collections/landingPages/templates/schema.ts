import { defineTable } from "convex/server";
import { v } from "convex/values";

export const templateTags = v.array(
  v.union(
    v.literal("saas"),
    v.literal("ecommerce"),
    v.literal("service"),
    v.literal("events"),
    v.literal("education"),
    v.literal("non-profit"),
    v.literal("other")
  )
);

export const landingPageTemplatesSchema = defineTable(
  v.object({
    title: v.string(),
    description: v.string(),
    slug: v.string(), // Must be unique
    type: v.optional(v.union(v.literal("firebuzz"), v.literal("workspace"))),
    thumbnail: v.optional(v.string()),
    key: v.string(),
    tags: templateTags,
    /* Relations */
    workspaceId: v.optional(v.id("workspaces")),
    projectId: v.optional(v.id("projects")),
    createdBy: v.optional(v.id("users")),
  })
).index("by_title", ["title"]).index("by_workspace_id", ["workspaceId"]).index("by_project_id", ["projectId"]).index("by_created_by", ["createdBy"]);
