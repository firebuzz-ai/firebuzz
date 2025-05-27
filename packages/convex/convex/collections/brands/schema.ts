import { v } from "convex/values";

/* https://cdn-dev.getfirebuzz.com/jd7amhzf0r48ecyhd3zxw6tv1h7aa57p/j57en4zh46v4xkhb8fn2hs97617abvsx/7f742129-5d15-4cc4-399d-22956e918e74 */

export const seoSchema = v.object({
  metaTitleTemplate: v.optional(v.string()),
  metaTitleDivider: v.optional(
    v.union(v.literal("|"), v.literal("-"), v.literal("•"), v.literal(":"))
  ),
  favicon: v.optional(v.string()),
  metaTitle: v.optional(v.string()),
  metaDescription: v.optional(v.string()),
  noIndex: v.optional(v.boolean()),
  noFollow: v.optional(v.boolean()),
  opengraph: v.optional(
    v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      type: v.optional(v.string()),
    })
  ),
  twitterCard: v.optional(
    v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      type: v.optional(v.string()),
    })
  ),
});

export const brandSchema = v.object({
  // Identity
  name: v.string(),
  website: v.optional(v.string()),
  description: v.optional(v.string()),
  persona: v.optional(v.string()),
  logo: v.optional(v.string()),
  logoDark: v.optional(v.string()),
  icon: v.optional(v.string()),
  iconDark: v.optional(v.string()),
  // SEO
  seo: v.optional(seoSchema),
  // Relations
  workspaceId: v.id("workspaces"),
  projectId: v.id("projects"),
  defaultThemeId: v.optional(v.id("themes")),
  // System
  updatedAt: v.optional(v.string()),
  createdBy: v.id("users"),
  updatedBy: v.optional(v.id("users")),
});
