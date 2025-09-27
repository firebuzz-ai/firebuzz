import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalMutation, mutation } from "../../_generated/server";
import { retrier } from "../../components/actionRetrier";
import { internalMutationWithTrigger } from "../../triggers";
import { ERRORS } from "../../utils/errors";
import { generateRandomSubdomain } from "../domains/project/helpers";
import { getCurrentUser, getCurrentUserWithWorkspace } from "../users/utils";

export const createWorkspace = mutation({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { title } = args;

    const user = await getCurrentUser(ctx);

    console.log("user", user);

    // Create workspace
    const workspaceId = await ctx.db.insert("workspaces", {
      externalId: user.externalId,
      ownerId: user._id, // We will change this to the organization id when we create the organization
      workspaceType: "personal",
      title,
      isOnboarded: false,
      isSubscribed: false,
    });

    console.log("workspaceId", workspaceId);

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

    // Generate a random subdomain and check if it's available
    let subdomain = generateRandomSubdomain();
    let isSubdomainAvailable = false;
    while (!isSubdomainAvailable) {
      isSubdomainAvailable = await ctx.runQuery(
        internal.collections.domains.project.queries.checkSubdomainIsAvailable,
        {
          subdomain: subdomain,
        }
      );

      if (isSubdomainAvailable) {
        break;
      }

      subdomain = generateRandomSubdomain();
    }

    // Create Project Domain
    await ctx.db.insert("projectDomains", {
      subdomain,
      domain: process.env.ROUTING_DOMAIN!,
      workspaceId: workspaceId,
      projectId: projectId,
    });

    // Set user's current project
    await ctx.db.patch(user._id, { currentProjectId: projectId });

    // Check if it's first time creating a workspace
    const hasAnotherWorkspace = await ctx.db
      .query("workspaces")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", user._id))
      .filter((q) => q.neq(q.field("_id"), workspaceId))
      .first()
      .then((workspace) => workspace !== null);

    // Create Onboarding
    await ctx.runMutation(internal.collections.onboarding.mutations.create, {
      workspaceId: workspaceId,
      projectId: projectId,
      createdBy: user._id,
      type: "workspace",
      isTrialActive: !hasAnotherWorkspace,
    });

    // Create Stripe customer
    await retrier.run(ctx, internal.lib.stripe.createStripeCustomer, {
      workspaceId: workspaceId,
      userId: user._id,
    });

    // Create Organization
    await retrier.run(ctx, internal.lib.clerk.createOrganizationInternal, {
      workspaceId: workspaceId,
      maxAllowedMemberships: 1, // We will change this to the number of memberships the user has purchased
      type: "personal",
    });

    return workspaceId;
  },
});

export const deleteWorkspace = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUserWithWorkspace(ctx);

    if (!user) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    const workspace = await ctx.db.get(user.currentWorkspaceId);

    if (!workspace) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    if (workspace.ownerId !== user._id) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    // Check if there are any active subscriptions
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspace._id))
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("status"), "active"),
            q.eq(q.field("status"), "trialing"),
            q.eq(q.field("status"), "incomplete"),
            q.eq(q.field("status"), "incomplete_expired"),
            q.eq(q.field("status"), "past_due"),
            q.eq(q.field("status"), "unpaid")
          ),
          q.eq(q.field("cancelAtPeriodEnd"), false)
        )
      )
      .collect();

    const hasActiveSubscriptions =
      subscriptions.filter((s) => s.metadata?.isShadow !== "true").length > 0;

    if (hasActiveSubscriptions) {
      throw new ConvexError(
        "You cannot delete your workspace because you have active subscriptions."
      );
    }

    // Delete workspace
    await ctx.db.delete(workspace._id);
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

export const update = mutation({
  args: {
    id: v.id("workspaces"),
    title: v.optional(v.string()),
    logo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    // Get workspace
    const workspace = await ctx.db.get(args.id);

    if (!workspace) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    // Check if user is the owner or has permission to update
    if (workspace.ownerId !== user._id) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    const updateObject: Partial<typeof workspace> = {};

    if (args.title !== undefined) {
      updateObject.title = args.title;
    }

    if (args.logo !== undefined) {
      updateObject.logo = args.logo;
    }

    await ctx.db.patch(args.id, updateObject);

    // Update organization name in Clerk too
    if (
      args.title !== undefined &&
      workspace.externalId &&
      workspace.externalId.startsWith("org_")
    ) {
      await ctx.scheduler.runAfter(
        0,
        internal.lib.clerk.updateOrganizationInternal,
        {
          organizationId: workspace.externalId,
          name: args.title,
        }
      );
    }
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

export const updateExternalId = internalMutation({
  args: {
    id: v.id("workspaces"),
    externalId: v.string(),
    type: v.union(v.literal("personal"), v.literal("team")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      externalId: args.externalId,
      workspaceType: args.type,
    });
  },
});

export const updateSeatsAndPlan = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    type: v.optional(v.union(v.literal("personal"), v.literal("team"))),
    seats: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);

    if (!workspace) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    if (args.type) {
      await ctx.db.patch(args.workspaceId, { workspaceType: args.type });
    }

    // Update organization max allowed memberships
    await ctx.scheduler.runAfter(
      0,
      internal.lib.clerk.updateOrganizationInternal,
      {
        organizationId: workspace.externalId!,
        maxAllowedMemberships: args.type === "team" ? args.seats : 1,
      }
    );
  },
});
