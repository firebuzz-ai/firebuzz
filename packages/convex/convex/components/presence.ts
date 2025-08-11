import { Presence } from "@convex-dev/presence";
import type { PresenceState } from "@convex-dev/presence/react";
import { ConvexError, v } from "convex/values";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { getCurrentUser } from "../collections/users/utils";
import { ERRORS } from "../utils/errors";

export const presence = new Presence(components.presence);

export const heartbeat = mutation({
  args: {
    roomId: v.string(),
    userId: v.id("users"),
    sessionId: v.string(),
    interval: v.number(),
  },
  handler: async (ctx, { roomId, userId, sessionId, interval }) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    return await presence.heartbeat(ctx, roomId, userId, sessionId, interval);
  },
});

export const list = query({
  args: { roomToken: v.string() },
  handler: async (ctx, { roomToken }) => {
    // Avoid adding per-user reads so all subscriptions can share same cache.
    const userList = await presence.list(ctx, roomToken);

    const userListWithNameAndAvatar = await Promise.all(
      userList.map(async (user) => {
        const userData = await ctx.db.get(user.userId as Id<"users">);

        if (!userData) return null;

        return {
          ...user,
          fullName: userData.fullName,
          imageKey: userData.imageKey,
        } as PresenceState;
      })
    );

    return userListWithNameAndAvatar.filter(Boolean) as PresenceState[];
  },
});

export const disconnect = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    // Can't check auth here because it's called over http from sendBeacon.
    return await presence.disconnect(ctx, sessionToken);
  },
});
