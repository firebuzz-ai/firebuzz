import { ConvexError, v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import {
  internalMutationWithTrigger,
  mutationWithTrigger,
} from "../../../triggers";
import { getCurrentUserWithWorkspace } from "../../users/utils";
import { fontSchema, themeSchema } from "./schema";

export const create = mutationWithTrigger({
  args: {
    name: v.string(),
    description: v.string(),
    lightTheme: themeSchema.validator.fields.lightTheme,
    darkTheme: themeSchema.validator.fields.darkTheme,
    fonts: v.array(fontSchema),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    const projectId = user?.currentProjectId;
    const workspaceId = user?.currentWorkspaceId;

    if (!user || !workspaceId || !projectId) {
      throw new ConvexError("Unauthorized");
    }

    // Get Brand
    const brand = await ctx.db
      .query("brands")
      .withIndex("by_project_id", (q) => q.eq("projectId", projectId))
      .first();

    if (!brand) {
      throw new ConvexError("Brand not found");
    }

    // Get Last Index
    const lastIndex = await ctx.db
      .query("themes")
      .filter((q) => q.eq(q.field("projectId"), user.currentProjectId))
      .order("desc")
      .first();

    const index = lastIndex ? (lastIndex.index ?? 0) + 1 : 0;

    const theme = await ctx.db.insert("themes", {
      name: args.name,
      description: args.description,
      createdBy: user._id,
      workspaceId,
      projectId,
      brandId: brand._id,
      index,
      isSystem: false,
      isVisible: true,
      lightTheme: args.lightTheme,
      darkTheme: args.darkTheme,
      fonts: args.fonts,
    });

    return theme;
  },
});

export const createInternal = internalMutationWithTrigger({
  args: {
    name: v.string(),
    description: v.string(),
    lightTheme: themeSchema.validator.fields.lightTheme,
    darkTheme: themeSchema.validator.fields.darkTheme,
    fonts: v.array(fontSchema),
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
    createdBy: v.id("users"),
    brandId: v.id("brands"),
  },
  handler: async (ctx, args) => {
    const theme = await ctx.db.insert("themes", {
      ...args,
      isSystem: true,
      isVisible: true,
      index: 0,
    });
    return theme;
  },
});

export const update = mutationWithTrigger({
  args: {
    id: v.id("themes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    index: v.optional(v.number()),
    isVisible: v.optional(v.boolean()),
    lightTheme: v.optional(themeSchema.validator.fields.lightTheme),
    darkTheme: v.optional(themeSchema.validator.fields.darkTheme),
    fonts: v.optional(v.array(fontSchema)),
    template: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    if (!user || !user.currentProjectId) {
      throw new ConvexError("Unauthorized");
    }

    const updateObject: Partial<Doc<"themes">> = {};

    if (args.name !== undefined) {
      updateObject.name = args.name;
    }

    if (args.description !== undefined) {
      updateObject.description = args.description;
    }

    if (args.index !== undefined) {
      updateObject.index = args.index;
    }

    if (args.isVisible !== undefined) {
      updateObject.isVisible = args.isVisible;
    }

    if (args.lightTheme !== undefined) {
      updateObject.lightTheme = args.lightTheme;
    }

    if (args.darkTheme !== undefined) {
      updateObject.darkTheme = args.darkTheme;
    }

    if (args.fonts !== undefined) {
      updateObject.fonts = args.fonts;
    }

    if (args.template !== undefined) {
      updateObject.template = args.template;
    }

    const theme = await ctx.db.patch(args.id, updateObject);

    return theme;
  },
});

export const promote = mutationWithTrigger({
  args: {
    id: v.id("themes"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    const currentProject = user?.currentProjectId;

    if (!user || !currentProject) {
      throw new ConvexError("Unauthorized");
    }

    // Get Current Theme
    const currentTheme = await ctx.db.get(args.id);
    if (!currentTheme) {
      throw new ConvexError("Theme not found");
    }

    // Get Current Brand
    const currentBrand = await ctx.db
      .query("brands")
      .withIndex("by_project_id", (q) => q.eq("projectId", currentProject))
      .first();

    if (!currentBrand) {
      throw new ConvexError("Brand not found");
    }

    // Get Current System Theme
    const currentSystemTheme = await ctx.db
      .query("themes")
      .withIndex("by_brand_id", (q) => q.eq("brandId", currentBrand._id))
      .filter((q) => q.eq(q.field("isSystem"), true))
      .first();

    // Update Theme (Current System Theme)
    if (currentSystemTheme) {
      await ctx.db.patch(currentSystemTheme._id, {
        isSystem: false,
      });
    }

    // Update Theme (Promoted Theme)
    await ctx.db.patch(args.id, {
      isSystem: true,
    });

    // Update Brand (Default Theme)
    await ctx.db.patch(currentBrand._id, {
      defaultThemeId: args.id,
    });
  },
});

export const deletePermanent = mutationWithTrigger({
  args: {
    id: v.id("themes"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    if (!user || !user.currentProjectId) {
      throw new ConvexError("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});
