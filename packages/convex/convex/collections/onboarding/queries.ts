import { v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { getCurrentUserWithWorkspace } from "../users/utils";

export const getCurrentWorkspaceOnboarding = query({
  args: {},
  handler: async (ctx) => {
    const { currentWorkspaceId } = await getCurrentUserWithWorkspace(ctx);

    const onboarding = await ctx.db
      .query("onboarding")
      .withIndex("by_workspace_id", (q) =>
        q.eq("workspaceId", currentWorkspaceId)
      )
      .filter((q) => q.eq(q.field("type"), "workspace"))
      .first();

    return onboarding;
  },
});

export const getCurrentProjectOnboarding = query({
  args: {},
  handler: async (ctx) => {
    const { currentProjectId } = await getCurrentUserWithWorkspace(ctx);

    if (!currentProjectId) {
      return null;
    }

    const onboarding = await ctx.db
      .query("onboarding")
      .withIndex("by_project_id", (q) => q.eq("projectId", currentProjectId))
      .filter((q) => q.eq(q.field("type"), "project"))
      .first();

    return onboarding;
  },
});

export const getByIdInternal = internalQuery({
  args: {
    onboardingId: v.id("onboarding"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.onboardingId);
  },
});

export const getByWorkspaceIdInternal = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("onboarding")
      .withIndex("by_workspace_id", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .filter((q) => q.eq(q.field("type"), "workspace"))
      .first();
  },
});
