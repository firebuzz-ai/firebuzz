import { ConvexError, v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, mutation } from "../../_generated/server";
import { internalMutationWithTrigger } from "../../triggers";
import { getCurrentUserWithWorkspace } from "../users/utils";
import { seoSchema } from "./schema";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    persona: v.optional(v.string()),
    logo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserWithWorkspace(ctx);

    if (!user || !user.currentWorkspaceId || !user.currentProjectId) {
      throw new ConvexError("Unauthorized");
    }

    const brand = await ctx.db.insert("brands", {
      name: args.name,
      description: args.description,
      persona: args.persona,
      logo: args.logo,
      createdBy: user._id,
      workspaceId: user.currentWorkspaceId,
      projectId: user.currentProjectId,
    });

    return brand;
  },
});

export const createInternal = internalMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    persona: v.optional(v.string()),
    logo: v.optional(v.string()),
    website: v.optional(v.string()),
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const brand = await ctx.db.insert("brands", args);

    return brand;
  },
});

export const update = mutation({
  args: {
    id: v.id("brands"),
    name: v.optional(v.string()),
    website: v.optional(v.string()),
    description: v.optional(v.string()),
    persona: v.optional(v.string()),
    logo: v.optional(v.string()),
    logoDark: v.optional(v.string()),
    icon: v.optional(v.string()),
    iconDark: v.optional(v.string()),
    defaultThemeId: v.optional(v.id("themes")),
    seo: v.optional(seoSchema),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    if (!user || !user.currentWorkspaceId || !user.currentProjectId) {
      throw new ConvexError("Unauthorized");
    }

    const brand = await ctx.db.get(args.id);

    if (!brand) {
      throw new ConvexError("Brand not found");
    }

    if (
      brand.workspaceId !== user.currentWorkspaceId ||
      brand.projectId !== user.currentProjectId
    ) {
      throw new ConvexError("Unauthorized");
    }

    const updatedFields: Partial<Doc<"brands">> = {
      updatedBy: user._id,
      updatedAt: new Date().toISOString(),
    };

    if (args.name) {
      updatedFields.name = args.name;
    }
    if (args.website) {
      updatedFields.website = args.website;
    }
    if (args.description) {
      updatedFields.description = args.description;
    }
    if (args.persona) {
      updatedFields.persona = args.persona;
    }
    if (args.logo) {
      updatedFields.logo = args.logo;
    }
    if (args.logoDark) {
      updatedFields.logoDark = args.logoDark;
    }
    if (args.icon) {
      updatedFields.icon = args.icon;
    }
    if (args.iconDark) {
      updatedFields.iconDark = args.iconDark;
    }

    if (args.defaultThemeId) {
      updatedFields.defaultThemeId = args.defaultThemeId;
    }

    if (args.seo) {
      updatedFields.seo = args.seo;
    }

    if (args.phone) {
      updatedFields.phone = args.phone;
    }
    if (args.email) {
      updatedFields.email = args.email;
    }
    if (args.address) {
      updatedFields.address = args.address;
    }

    const updatedBrand = await ctx.db.patch(args.id, updatedFields);

    return updatedBrand;
  },
});

export const updateInternal = internalMutation({
  args: {
    id: v.id("brands"),
    name: v.optional(v.string()),
    website: v.optional(v.string()),
    description: v.optional(v.string()),
    persona: v.optional(v.string()),
    logo: v.optional(v.string()),
    logoDark: v.optional(v.string()),
    icon: v.optional(v.string()),
    iconDark: v.optional(v.string()),
    defaultThemeId: v.optional(v.id("themes")),
    seo: v.optional(seoSchema),
  },
  handler: async (ctx, args) => {
    const updatedFields: Partial<Doc<"brands">> = {};

    if (args.name) {
      updatedFields.name = args.name;
    }
    if (args.website) {
      updatedFields.website = args.website;
    }
    if (args.description) {
      updatedFields.description = args.description;
    }
    if (args.persona) {
      updatedFields.persona = args.persona;
    }
    if (args.logo) {
      updatedFields.logo = args.logo;
    }
    if (args.logoDark) {
      updatedFields.logoDark = args.logoDark;
    }
    if (args.icon) {
      updatedFields.icon = args.icon;
    }
    if (args.iconDark) {
      updatedFields.iconDark = args.iconDark;
    }
    if (args.defaultThemeId) {
      updatedFields.defaultThemeId = args.defaultThemeId;
    }
    if (args.seo) {
      updatedFields.seo = args.seo;
    }

    await ctx.db.patch(args.id, updatedFields);
  },
});

export const deletePermanentByProjectId = internalMutationWithTrigger({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const brand = await ctx.db
      .query("brands")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .first();

    if (brand) {
      await ctx.db.delete(brand._id);
    }
  },
});
