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
    thumbnail: v.string(),
    previewUrl: v.string(),
    key: v.string(),
    tags: templateTags,
    files: v.string(),
  })
).index("by_title", ["title"]);
