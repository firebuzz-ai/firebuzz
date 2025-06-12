import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalMutation, mutation } from "../../_generated/server";
import { retrier } from "../../components/actionRetrier";
import { internalMutationWithTrigger } from "../../triggers";
import { ERRORS } from "../../utils/errors";
import { getCurrentUser } from "../users/utils";
import { workspaceSchema } from "./schema";

export const createPersonalWorkspace = mutation({
  args: {
    title: workspaceSchema.fields.title,
    color: workspaceSchema.fields.color,
    icon: workspaceSchema.fields.icon,
  },
  handler: async (ctx, args) => {
    const { title, color, icon } = args;

    const user = await getCurrentUser(ctx);

    const isPersonalSpaceAvailable = await ctx.runQuery(
      internal.collections.workspaces.queries.checkIsPersonalWorkspaceAvailable,
      {
        ownerId: user._id,
      }
    );

    if (!isPersonalSpaceAvailable) {
      throw new ConvexError(ERRORS.PERSONAL_WORKSPACE_LIMIT_REACHED);
    }

    // Create workspace
    const workspaceId = await ctx.db.insert("workspaces", {
      externalId: user.externalId,
      ownerId: user._id,
      workspaceType: "personal",
      title,
      color,
      icon,
      isOnboarded: false,
      isSubscribed: false,
    });

    // Set user's current workspace
    await ctx.db.patch(user._id, { currentWorkspaceId: workspaceId });

    // Create Project
    const projectId = await ctx.db.insert("projects", {
      title: "Untitled Project",
      color: "indigo",
      icon: "rocket",
      workspaceId: workspaceId,
      createdBy: user._id,
      isOnboarded: false,
    });

    // Set user's current project
    await ctx.db.patch(user._id, { currentProjectId: projectId });

    // Create Onboarding
    await ctx.runMutation(internal.collections.onboarding.mutations.create, {
      workspaceId: workspaceId,
      projectId: projectId,
      createdBy: user._id,
      type: "workspace",
    });

    // Create Stripe customer
    await retrier.run(ctx, internal.lib.stripe.createStripeCustomer, {
      workspaceId: workspaceId,
      userId: user._id,
    });

    return workspaceId;
  },
});

export const deletePermanentInternal = internalMutationWithTrigger({
  args: {
    id: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const updateCustomerId = internalMutation({
  args: {
    id: v.id("workspaces"),
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { customerId: args.customerId });
  },
});
