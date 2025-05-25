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
  ring: v.string(),
  radius: v.string(),
});

// Font Schema
export const fontSchema = v.object({
  family: v.union(v.literal("sans"), v.literal("serif"), v.literal("mono")),
  name: v.string(),
  type: v.union(v.literal("google"), v.literal("system"), v.literal("custom")),
});

export const themeSchema = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  index: v.number(),
  isVisible: v.boolean(),
  isSystem: v.boolean(),
  // Themes
  darkTheme: themeVariables,
  lightTheme: themeVariables,
  fonts: v.optional(v.array(fontSchema)),
  // Relations
  workspaceId: v.id("workspaces"),
  brandId: v.id("brands"),
  projectId: v.id("projects"),
  createdBy: v.id("users"),
  updatedBy: v.optional(v.id("users")),
  // Timestamps
  updatedAt: v.optional(v.string()),
});
