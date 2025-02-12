import { asyncMap } from "convex-helpers";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  type MutationCtx,
  type QueryCtx,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { getCurrentUser, getUserByExternalId } from "./users";

// @schema
export const workspaceSchema = v.object({
  externalId: v.string(), // Clerk's Organization ID or User ID
  workspaceType: v.union(v.literal("personal"), v.literal("team")),
  ownerId: v.id("users"),
  title: v.string(),
  slug: v.string(),
  color: v.string(),
  icon: v.string(),
  onboardingCompleted: v.boolean(),
});

// @query
export const getPersonal = query({
  handler: async (ctx) => {
    // Check if user is authenticated
    const user = await getCurrentUser(ctx);
    const workspace = await getWorkspaceByExternalId(ctx, user.externalId);

    return workspace;
  },
});

export const getCurrent = query({
  handler: async (ctx) => {
    // Check if user is authenticated
    const user = await getCurrentUser(ctx);
    const workspace = await getWorkspaceById(ctx, user.currentWorkspaceId);

    return workspace;
  },
});

export const getAll = query({
  args: {
    externalIds: v.array(v.string()),
  },
  handler: async (ctx, { externalIds }) => {
    // Check if user is authenticated
    const user = await getCurrentUser(ctx);

    // Get all team workspaces
    const workspaces = await asyncMap(externalIds, async (externalId) => {
      return await getWorkspaceByExternalId(ctx, externalId);
    });

    // Get personal workspace
    const personalWorkspace = await getWorkspaceByExternalId(
      ctx,
      user.externalId
    );

    // Return all workspaces
    return workspaces
      .filter((workspace) => workspace !== null)
      .concat(personalWorkspace ? [personalWorkspace] : []);
  },
});

// @internalQuery
export const checkSlug = internalQuery({
  args: {
    slug: v.string(),
  },
  handler: async ({ db }, { slug }) => {
    const workspace = await db
      .query("workspaces")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    return workspace === null;
  },
});

export const checkPersonalSpace = internalQuery({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    if (!externalId) {
      return false;
    }

    const personalSpace = await getWorkspaceByExternalId(ctx, externalId);
    return personalSpace === null;
  },
});

// @mutation
export const create = mutation({
  args: {
    title: workspaceSchema.fields.title,
    slug: workspaceSchema.fields.slug,
    color: workspaceSchema.fields.color,
    icon: workspaceSchema.fields.icon,
  },
  handler: async (ctx, args) => {
    const { title, slug, color, icon } = args;

    const clerkUser = await ctx.auth.getUserIdentity();

    if (!clerkUser) {
      console.log("clerkUser is null");
      throw new ConvexError("Unauthorized");
    }

    const user = await getUserByExternalId(ctx, clerkUser.subject); // clerkUser.subject is the user's ID

    if (!user) {
      console.log("user is null");
      throw new ConvexError("Unauthorized");
    }

    const isSlugAvailable = await ctx.runQuery(
      internal.collections.workspace.checkSlug,
      {
        slug,
      }
    );

    if (!isSlugAvailable) {
      throw new ConvexError(
        "Slug already taken. Please try again with a different slug."
      );
    }

    const isPersonalSpaceAvailable = await ctx.runQuery(
      internal.collections.workspace.checkPersonalSpace,
      {
        externalId: user.externalId,
      }
    );

    if (!isPersonalSpaceAvailable) {
      throw new ConvexError(
        "You already have a personal workspace. Please upgrade to a team workspace to create more."
      );
    }

    await ctx.db.insert("workspaces", {
      externalId: user.externalId,
      ownerId: user._id,
      workspaceType: "personal",
      title,
      slug,
      color,
      icon,
      onboardingCompleted: false,
    });
  },
});

// @helpers
export const getWorkspaceById = async (
  ctx: QueryCtx | MutationCtx,
  id: Id<"workspaces">
) => {
  const workspace = await ctx.db.get(id);
  return workspace;
};

export const getWorkspaceByExternalId = async (
  ctx: QueryCtx | MutationCtx,
  externalId: string
) => {
  const workspace = await ctx.db
    .query("workspaces")
    .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
    .unique();
  return workspace;
};
