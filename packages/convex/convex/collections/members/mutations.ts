import { ConvexError, v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { ERRORS } from "../../utils/errors";

export const createInternal = internalMutation({
  args: {
    externalId: v.string(),
    role: v.union(v.literal("org:admin"), v.literal("org:member")),
    organizationExternalId: v.string(),
    userExternalId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1) Check if Member already exists
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (existingMember) {
      console.log("Member already exists", existingMember);
      return;
    }

    // 2) Get Workspace by External ID
    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_external_id", (q) =>
        q.eq("externalId", args.organizationExternalId)
      )
      .unique();

    if (!workspace) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    // 3) Get User by External ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) =>
        q.eq("externalId", args.userExternalId)
      )
      .unique();

    if (!user) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    // 4) Create Member
    return await ctx.db.insert("members", {
      externalId: args.externalId,
      role: args.role,
      workspaceId: workspace._id,
      userId: user._id,
      organizationExternalId: args.organizationExternalId,
      userExternalId: args.userExternalId,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const updateInternal = internalMutation({
  args: {
    externalId: v.string(),
    role: v.union(v.literal("org:admin"), v.literal("org:member")),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("members")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();
    if (!member) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }
    return await ctx.db.patch(member._id, {
      role: args.role,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const deleteInternal = internalMutation({
  args: {
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("members")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();
    if (!member) {
      console.log("Member not found", args.externalId);
      return;
    }
    return await ctx.db.delete(member._id);
  },
});

export const updateRoleInternal = internalMutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    role: v.union(v.literal("org:admin"), v.literal("org:member")),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("members")
      .withIndex("by_user_id_workspace_id", (q) =>
        q.eq("userId", args.userId).eq("workspaceId", args.workspaceId)
      )
      .unique();

    if (!member) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    return await ctx.db.patch(member._id, {
      role: args.role,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const removeInternal = internalMutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("members")
      .withIndex("by_user_id_workspace_id", (q) =>
        q.eq("userId", args.userId).eq("workspaceId", args.workspaceId)
      )
      .unique();

    if (!member) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    return await ctx.db.delete(member._id);
  },
});
