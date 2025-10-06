import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";

export const getById = query({
  args: {
    id: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserWithWorkspace(ctx);

    const agentSession = await ctx.db.get(args.id);

    if (!agentSession) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    if (agentSession.workspaceId !== user.currentWorkspaceId) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    const session = await ctx.db.get(args.id);

    return session;
  },
});

export const getByIdInternal = internalQuery({
  args: {
    id: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
