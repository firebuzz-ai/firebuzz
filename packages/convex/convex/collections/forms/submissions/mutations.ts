import { ConvexError, v } from "convex/values";
import { internalMutation, mutation } from "../../../_generated/server";
import { ERRORS } from "../../../utils/errors";
import { getCurrentUserWithWorkspace } from "../../users/utils";

export const createInternal = internalMutation({
  args: {
    formId: v.id("forms"),
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    campaignId: v.id("campaigns"),
    data: v.record(v.string(), v.any()),
    isTest: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("formSubmissions", {
      ...args,
    });
  },
});

export const deleteTemporary = mutation({
  args: {
    id: v.id("formSubmissions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserWithWorkspace(ctx);

    const submission = await ctx.db.get(args.id);
    if (!submission) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    if (submission.workspaceId !== user.currentWorkspaceId) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    return await ctx.db.delete(args.id);
  },
});
