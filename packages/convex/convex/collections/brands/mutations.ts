import { ConvexError, v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { mutation } from "../../_generated/server";
import { getCurrentUser } from "../users/utils";

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user || !user.currentWorkspaceId || !user.currentProject) {
      throw new ConvexError("Unauthorized");
    }

    const brand = await ctx.db.insert("brands", {
      name: args.name,
      createdBy: user._id,
      workspaceId: user.currentWorkspaceId,
      projectId: user.currentProject,
    });

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
    favicon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user || !user.currentWorkspaceId || !user.currentProject) {
      throw new ConvexError("Unauthorized");
    }

    const brand = await ctx.db.get(args.id);

    if (!brand) {
      throw new ConvexError("Brand not found");
    }

    if (
      brand.workspaceId !== user.currentWorkspaceId ||
      brand.projectId !== user.currentProject
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
    if (args.favicon) {
      updatedFields.favicon = args.favicon;
    }

    const updatedBrand = await ctx.db.patch(args.id, updatedFields);

    return updatedBrand;
  },
});
