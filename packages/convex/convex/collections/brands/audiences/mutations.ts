import { asyncMap } from "convex-helpers";
import { ConvexError, v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { mutation } from "../../../_generated/server";
import { getCurrentUser } from "../../users/utils";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    motivations: v.string(),
    avatar: v.string(),
    frustrations: v.string(),
    goals: v.string(),
    terminologies: v.array(v.string()),
    gender: v.union(v.literal("male"), v.literal("female")),
    age: v.union(
      v.literal("18-24"),
      v.literal("25-34"),
      v.literal("35-44"),
      v.literal("45-54"),
      v.literal("55-64"),
      v.literal("65+")
    ),
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

    const audience = await ctx.db.insert("audiences", {
      name: args.name,
      avatar: args.avatar,
      description: args.description,
      motivations: args.motivations,
      frustrations: args.frustrations,
      terminologies: args.terminologies,
      gender: args.gender,
      age: args.age,
      goals: args.goals,
      workspaceId,
      projectId,
      brandId: brand._id,
      createdBy: user._id,
    });

    return audience;
  },
});

export const update = mutation({
  args: {
    id: v.id("audiences"),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    description: v.optional(v.string()),
    motivations: v.optional(v.string()),
    frustrations: v.optional(v.string()),
    goals: v.optional(v.string()),
    terminologies: v.optional(v.array(v.string())),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    age: v.optional(
      v.union(
        v.literal("18-24"),
        v.literal("25-34"),
        v.literal("35-44"),
        v.literal("45-54"),
        v.literal("55-64"),
        v.literal("65+")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const projectId = user?.currentProject;
    const workspaceId = user?.currentWorkspaceId;

    if (!user || !workspaceId || !projectId) {
      throw new ConvexError("Unauthorized");
    }

    const audience = await ctx.db.get(args.id);

    if (!audience) {
      throw new ConvexError("Audience not found");
    }

    if (audience.projectId !== projectId) {
      throw new ConvexError("Unauthorized");
    }

    const updateObject: Partial<Doc<"audiences">> = {
      updatedBy: user._id,
      updatedAt: new Date().toISOString(),
    };

    if (args.name) {
      updateObject.name = args.name;
    }

    if (args.gender) {
      updateObject.gender = args.gender;
    }

    if (args.description) {
      updateObject.description = args.description;
    }

    if (args.motivations) {
      updateObject.motivations = args.motivations;
    }

    if (args.frustrations) {
      updateObject.frustrations = args.frustrations;
    }

    if (args.goals) {
      updateObject.goals = args.goals;
    }

    if (args.terminologies) {
      updateObject.terminologies = args.terminologies;
    }

    if (args.avatar) {
      updateObject.avatar = args.avatar;
    }

    const updatedAudience = await ctx.db.patch(args.id, updateObject);

    return updatedAudience;
  },
});

export const duplicate = mutation({
  args: {
    id: v.id("audiences"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const projectId = user?.currentProject;
    const workspaceId = user?.currentWorkspaceId;

    if (!user || !workspaceId || !projectId) {
      throw new ConvexError("Unauthorized");
    }

    const audience = await ctx.db.get(args.id);

    if (!audience) {
      throw new ConvexError("Audience not found");
    }

    const duplicateAudience = await ctx.db.insert("audiences", {
      name: `${audience.name} (Copy)`,
      avatar: audience.avatar,
      description: audience.description,
      motivations: audience.motivations,
      frustrations: audience.frustrations,
      goals: audience.goals,
      workspaceId,
      projectId,
      brandId: audience.brandId,
      createdBy: user._id,
      terminologies: audience.terminologies,
      gender: audience.gender,
      age: audience.age,
    });

    return duplicateAudience;
  },
});

export const duplicateMany = mutation({
  args: {
    ids: v.array(v.id("audiences")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const projectId = user?.currentProject;
    const workspaceId = user?.currentWorkspaceId;

    if (!user || !workspaceId || !projectId) {
      throw new ConvexError("Unauthorized");
    }

    const audiences = await asyncMap(args.ids, async (id) => {
      const audience = await ctx.db.get(id);
      if (!audience) {
        throw new ConvexError("Audience not found");
      }
      return audience;
    });

    if (audiences.some((audience) => audience.projectId !== projectId)) {
      throw new ConvexError("Unauthorized");
    }

    await asyncMap(audiences, async (audience) => {
      await ctx.db.insert("audiences", {
        name: `${audience.name} (Copy)`,
        avatar: audience.avatar,
        description: audience.description,
        motivations: audience.motivations,
        frustrations: audience.frustrations,
        goals: audience.goals,
        terminologies: audience.terminologies,
        gender: audience.gender,
        age: audience.age,
        workspaceId,
        projectId,
        brandId: audience.brandId,
        createdBy: user._id,
      });
    });

    return { success: true };
  },
});

export const deletePermanent = mutation({
  args: {
    id: v.id("audiences"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const projectId = user?.currentProject;
    const workspaceId = user?.currentWorkspaceId;

    if (!user || !workspaceId || !projectId) {
      throw new ConvexError("Unauthorized");
    }

    const audience = await ctx.db.get(args.id);

    if (!audience) {
      throw new ConvexError("Audience not found");
    }

    if (audience.projectId !== projectId) {
      throw new ConvexError("Unauthorized");
    }

    await ctx.db.delete(args.id);

    return { success: true };
  },
});

export const deletePermanentMany = mutation({
  args: {
    ids: v.array(v.id("audiences")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const projectId = user?.currentProject;
    const workspaceId = user?.currentWorkspaceId;

    if (!user || !workspaceId || !projectId) {
      throw new ConvexError("Unauthorized");
    }

    const audiences = await asyncMap(args.ids, async (id) => {
      const audience = await ctx.db.get(id);
      if (!audience) {
        throw new ConvexError("Audience not found");
      }
      return audience;
    });

    if (audiences.some((audience) => audience.projectId !== projectId)) {
      throw new ConvexError("Unauthorized");
    }

    await asyncMap(audiences, async (audience) => {
      await ctx.db.delete(audience._id);
    });

    return { success: true };
  },
});
