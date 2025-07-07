import { asyncMap } from "convex-helpers";
import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";

export const getByWorkspace = query({
  handler: async (ctx) => {
    const user = await getCurrentUserWithWorkspace(ctx);

    if (!user || !user.currentWorkspaceId) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    const members = await ctx.db
      .query("members")
      .withIndex("by_workspace_id", (q) =>
        q.eq("workspaceId", user.currentWorkspaceId)
      )
      .collect();

    const membersWithUserData = await asyncMap(members, async (member) => {
      const user = await ctx.db.get(member.userId);
      return {
        ...member,
        user,
      };
    });

    return membersWithUserData;
  },
});

export const getByUserIdAndWorkspaceInternal = internalQuery({
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

    return member;
  },
});
