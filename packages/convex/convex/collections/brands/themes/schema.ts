import { defineTable } from "convex/server";
import { v } from "convex/values";

// Theme Variables Schema
export const themeVariables = v.object({
  background: v.string(),
  foreground: v.string(),
  muted: v.string(),
  mutedForeground: v.string(),
  popover: v.string(),
  popoverForeground: v.string(),
  border: v.string(),
  input: v.string(),
  card: v.string(),
  cardForeground: v.string(),
  primary: v.string(),
  primaryForeground: v.string(),
  secondary: v.string(),
  secondaryForeground: v.string(),
  accent: v.string(),
  accentForeground: v.string(),
  destructive: v.string(),
  destructiveForeground: v.string(),
  chart1: v.string(),
  chart2: v.string(),
  chart3: v.string(),
  chart4: v.string(),
  chart5: v.string(),
  ring: v.string(),
});

// Font Schema
export const fontSchema = v.object({
  family: v.union(v.literal("sans"), v.literal("serif"), v.literal("mono")),
  name: v.string(),
  type: v.union(v.literal("google"), v.literal("system"), v.literal("custom")),
});

export const themeSchema = defineTable(
  v.object({
    name: v.string(),
    description: v.optional(v.string()),
    index: v.number(),
    isVisible: v.boolean(),
    isSystem: v.boolean(),
    // Themes
    darkTheme: themeVariables,
    lightTheme: v.object({
      ...themeVariables.fields,
      radius: v.string(),
    }),
    fonts: v.optional(v.array(fontSchema)),
    template: v.optional(v.string()),
    // Relations
    workspaceId: v.id("workspaces"),
    brandId: v.id("brands"),
    projectId: v.id("projects"),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
    // Timestamps
    updatedAt: v.optional(v.string()),
  })
)
  .index("by_workspace_id", ["workspaceId"])
  .index("by_project_id", ["projectId"])
  .index("by_brand_id", ["brandId"]);

export const themeInsertSchema = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  index: v.number(),
  isVisible: v.boolean(),
  isSystem: v.boolean(),
  darkTheme: themeVariables,
  lightTheme: v.object({
    ...themeVariables.fields,
    radius: v.string(),
  }),
  fonts: v.optional(v.array(fontSchema)),
});
