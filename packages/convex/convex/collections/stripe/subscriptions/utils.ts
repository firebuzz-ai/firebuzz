import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";

export const getCurrentSubscription = async (
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">
) => {
  const subscriptions = await ctx.db
    .query("subscriptions")
    .withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  const regularSubscriptions = subscriptions.filter(
    (subscription) => subscription.metadata?.isShadow === "false"
  );

  if (regularSubscriptions.length === 0) {
    return null;
  }

  return regularSubscriptions[0];
};

export const getCurrentShadowSubscription = async (
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">
) => {
  const subscriptions = await ctx.db
    .query("subscriptions")
    .withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  const shadowSubscriptions = subscriptions.filter(
    (subscription) => subscription.metadata?.isShadow === "true"
  );

  if (shadowSubscriptions.length === 0) {
    return null;
  }

  return shadowSubscriptions[0];
};
