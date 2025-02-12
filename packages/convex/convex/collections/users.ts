import type { UserJSON } from "@clerk/backend";
import { slugify } from "@firebuzz/utils";
import { ConvexError, type Validator, v } from "convex/values";
import {
  type QueryCtx,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { internalMutationWithTrigger } from "../triggers";
import { getWorkspaceByExternalId } from "./workspace";

// @schema
export const userSchema = v.object({
  externalId: v.string(),
  email: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  fullName: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  currentProject: v.optional(v.id("projects")),
});

// @mutation
export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
  async handler(ctx, { data }) {
    const userAttributes = {
      firstName: data.first_name ?? undefined,
      lastName: data.last_name ?? undefined,
      fullName: `${data.first_name} ${data.last_name}`,
      imageUrl: data.image_url ?? undefined,
      email: data.email_addresses[0].email_address,
      externalId: data.id,
    };

    // Check if the user already exists
    const user = await getUserByExternalId(ctx, data.id);
    if (user === null) {
      // If the user does not exist, create a new user
      const newUserId = await ctx.db.insert("users", userAttributes);
      // Insert a personal workspace for the user
      await ctx.db.insert("workspaces", {
        externalId: data.id,
        workspaceType: "personal",
        ownerId: newUserId,
        title: `${data.first_name}'s Workspace`,
        slug: slugify(`${data.first_name}-personal-${newUserId.slice(0, 8)}`),
        color: "sky",
        icon: "cup",
        onboardingCompleted: false,
      });
    } else {
      // If the user exists, update the user
      await ctx.db.patch(user._id, userAttributes);
    }
  },
});

export const deleteUserWithAllDataByExternalId = internalMutationWithTrigger({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const user = await getUserByExternalId(ctx, externalId);
    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});

export const updateCurrentProject = mutation({
  args: {
    id: v.id("users"),
    currentProject: v.optional(v.id("projects")),
  },
  handler: async (ctx, { id, currentProject }) => {
    await ctx.db.patch(id, { currentProject });
  },
});

// @query
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

// @helpers
export const getUserByExternalId = async (
  ctx: QueryCtx,
  externalId: string
) => {
  return await ctx.db
    .query("users")
    .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
    .unique();
};

export const getCurrentUser = async (ctx: QueryCtx) => {
  const clerkUser = await ctx.auth.getUserIdentity();

  if (!clerkUser) {
    throw new ConvexError("Unauthorized");
  }

  const user = await getUserByExternalId(ctx, clerkUser.subject); // clerkUser.subject is the user's ID

  if (!user) {
    throw new ConvexError("Unauthorized");
  }

  const currentWorkspace = await getWorkspaceByExternalId(
    ctx,
    (clerkUser.org_id ?? clerkUser.subject) as string
  );

  if (!currentWorkspace) {
    throw new ConvexError("Unauthorized");
  }

  const userWithCurrentWorkspace = {
    ...user,
    currentWorkspaceId: currentWorkspace?._id,
    currentWorkspaceExternalId: currentWorkspace?.externalId,
    currentRole: (clerkUser.org_role ?? "Admin") as "Admin" | "Member",
  };

  return userWithCurrentWorkspace;
};

export const getCurrentUserInternal = internalQuery({
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});
