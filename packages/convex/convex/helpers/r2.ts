import { R2 } from "@convex-dev/r2";
import { ConvexError, v } from "convex/values";
import { components } from "../_generated/api";
import { internalMutation, mutation, query } from "../_generated/server";
import { getCurrentUser } from "../collections/users/utils";

export const r2 = new R2(components.r2);

export const { syncMetadata } = r2.clientApi({
  checkUpload: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError("Unauthorized");
    }
  },
  /*  onUpload: async (ctx, bucket, key) => {
    const currentUser = await getCurrentUser(ctx);

    const workspaceId = currentUser.currentWorkspaceId;
    const projectId = currentUser.currentProject;

    // Get Metadata

    const metadata = await r2.getMetadata(ctx, key);
  }, */
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);

    const key = `/${currentUser.currentWorkspaceId}/${currentUser.currentProject}/${crypto.randomUUID()}`;
    return r2.generateUploadUrl(key);
  },
});

export const getImageUrl = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    return r2.getUrl(args.key);
  },
});

export const deletePermanent = internalMutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    return r2.deleteObject(ctx, args.key);
  },
});
