import { ConvexError, v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { mutationWithTrigger } from "../../../triggers";
import { getCurrentUser } from "../../users/utils";
import { fontSchema, themeVariables } from "./schema";

export const create = mutationWithTrigger({
  args: {
    name: v.string(),
    description: v.string(),
    lightTheme: themeVariables,
    darkTheme: themeVariables,
    fonts: v.array(fontSchema),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const projectId = user?.currentProject;
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
      .filter((q) => q.eq(q.field("projectId"), user.currentProject))
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

export const update = mutationWithTrigger({
  args: {
    id: v.id("themes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    index: v.optional(v.number()),
    isVisible: v.optional(v.boolean()),
    lightTheme: v.optional(themeVariables),
    darkTheme: v.optional(themeVariables),
    fonts: v.optional(v.array(fontSchema)),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user || !user.currentProject) {
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

    const theme = await ctx.db.patch(args.id, updateObject);

    return theme;
  },
});

export const deletePermanent = mutationWithTrigger({
  args: {
    id: v.id("themes"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user || !user.currentProject) {
      throw new ConvexError("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});
