import { retrier } from "components/actionRetrier";
import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, mutation } from "../../_generated/server";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";

const SESSION_CONFIG = {
  maxDuration: 10 * 60 * 1000, // 10 minutes
  maxIdleTime: 2 * 60 * 1000, // 2 minutes
};

const SANDBOX_CONFIG = {
  timeout: SESSION_CONFIG.maxDuration + 2 * 60 * 1000, // Session timeout + 2 minutes
  ports: [5173],
  vcpus: 2 as const,
  runtime: "node22" as const,
  cwd: "/vercel/sandbox" as const,
};

export const joinOrCreateSession = mutation({
  args: {
    assetSettings: v.union(
      v.object({
        type: v.literal("landingPage"),
        id: v.id("landingPages"),
      }),
      v.object({
        type: v.literal("form"),
        id: v.id("forms"),
      })
    ),
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, { assetSettings, campaignId }) => {
    // Authenticate user
    const user = await getCurrentUserWithWorkspace(ctx);

    // Get campaign
    const campaign = await ctx.db.get(campaignId);

    if (!campaign) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    // Check if campaign is in same workspace
    if (campaign.workspaceId !== user.currentWorkspaceId) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    // LANDING PAGE
    if (assetSettings.type === "landingPage") {
      // Get Asset (It's only landing page for now)
      const asset = await ctx.db.get(assetSettings.id);

      if (!asset) {
        throw new ConvexError(ERRORS.NOT_FOUND);
      }

      if (asset.workspaceId !== user.currentWorkspaceId) {
        throw new ConvexError(ERRORS.UNAUTHORIZED);
      }

      let sessionId: Id<"agentSessions"> | null = null;
      const session = await ctx.db
        .query("agentSessions")
        .withIndex("by_landing_page_id", (q) =>
          q.eq("landingPageId", assetSettings.id)
        )
        /* .filter((q) => q.eq(q.field("status"), "active")) */ // TODO: Uncomment this
        .first();

      // A) NEW SESSION ROUTE
      if (!session) {
        sessionId = await ctx.db.insert("agentSessions", {
          workspaceId: user.currentWorkspaceId,
          projectId: campaign.projectId,
          campaignId,
          createdBy: user._id,
          startedAt: new Date().toISOString(),
          messageQueue: [],
          todoList: [],
          joinedUsers: [user._id],
          sessionType: "regular",
          status: "active",
          assetType: "landingPage",
          landingPageId: assetSettings.id,
          maxDuration: SESSION_CONFIG.maxDuration,
          maxIdleTime: SESSION_CONFIG.maxIdleTime,
        });

        // Initialize Agent Session Durable Object
        await retrier.run(
          ctx,
          internal.collections.agentSessions.actions.initializeAgentSessionDO,
          {
            sessionId,
            maxDuration: SESSION_CONFIG.maxDuration,
            maxIdleTime: SESSION_CONFIG.maxIdleTime,
          }
        );

        // Create or get sandbox session
        await ctx.scheduler.runAfter(
          0,
          internal.collections.sandboxes.actions.createOrGetSandboxSession,
          {
            sessionId,
            assetSettings: assetSettings,
            config: SANDBOX_CONFIG,
          }
        );
      }
      // B) EXISTING SESSION ROUTE
      else {
        // Assign sessionId to existing session
        sessionId = session._id;
        // Insert users into session joinedUsers (if not already in the array)
        if (!session.joinedUsers.includes(user._id)) {
          await ctx.db.patch(session._id, {
            joinedUsers: Array.from(
              new Set([...session.joinedUsers, user._id])
            ),
          });
        }
      }

      return sessionId;
    }
  },
});

export const updateSandboxId = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    sandboxId: v.id("sandboxes"),
  },
  handler: async (ctx, { sessionId, sandboxId }) => {
    return await ctx.db.patch(sessionId, {
      sandboxId,
    });
  },
});

export const scheduleSessionOver = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    reason: v.union(v.literal("idle"), v.literal("max-duration")),
    delay: v.number(), // milliseconds
  },
  handler: async (ctx, { sessionId, reason, delay }) => {
    const session = await ctx.db.get(sessionId);

    if (!session) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    // Cancel any existing scheduled shutdown
    if (session.scheduledId) {
      await ctx.scheduler.cancel(session.scheduledId);
    }

    // Schedule the session to end
    const scheduledId: Id<"_scheduled_functions"> =
      await ctx.scheduler.runAfter(
        delay,
        internal.collections.agentSessions.mutations.endSession,
        {
          sessionId,
          reason,
        }
      );

    // Update session with shutdown info
    await ctx.db.patch(sessionId, {
      shutdownAt: new Date(Date.now() + delay).toISOString(),
      scheduledId,
      shutdownReason: reason,
    });

    return { success: true, scheduledId };
  },
});

export const extendSessionPublic = mutation({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, { sessionId }) => {
    // Authenticate user
    const user = await getCurrentUserWithWorkspace(ctx);

    const session = await ctx.db.get(sessionId);

    if (!session) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    // Check if user is part of the session
    if (!session.joinedUsers.includes(user._id)) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    // Cancel any scheduled shutdown
    if (session.scheduledId) {
      await ctx.scheduler.cancel(session.scheduledId);
    }

    // Clear shutdown fields
    await ctx.db.patch(sessionId, {
      shutdownAt: undefined,
      scheduledId: undefined,
      shutdownReason: undefined,
      updatedAt: new Date().toISOString(),
    });

    // Extend session in DO
    await ctx.scheduler.runAfter(
      0,
      internal.collections.agentSessions.actions.extendAgentSession,
      {
        sessionId,
      }
    );

    return { success: true };
  },
});

export const extendSession = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);

    if (!session) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    // Cancel any scheduled shutdown
    if (session.scheduledId) {
      await ctx.scheduler.cancel(session.scheduledId);
    }

    // Clear shutdown fields
    await ctx.db.patch(sessionId, {
      shutdownAt: undefined,
      scheduledId: undefined,
      shutdownReason: undefined,
      updatedAt: new Date().toISOString(),
    });

    // Extend session in DO
    await ctx.scheduler.runAfter(
      0,
      internal.collections.agentSessions.actions.extendAgentSession,
      {
        sessionId,
      }
    );

    return { success: true };
  },
});

export const endSession = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    reason: v.union(v.literal("idle"), v.literal("max-duration")),
  },
  handler: async (ctx, { sessionId, reason }) => {
    const session = await ctx.db.get(sessionId);

    if (!session) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    // Kill sandbox if exists
    if (session.sandboxId) {
      await ctx.runMutation(
        internal.collections.sandboxes.mutations.killSandboxInternal,
        {
          id: session.sandboxId,
        }
      );
    }

    // Update session to completed
    await ctx.db.patch(sessionId, {
      status: "completed",
      endedAt: new Date().toISOString(),
      shutdownReason: reason,
      scheduledId: undefined,
    });

    return { success: true };
  },
});

export const reportError = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    error: v.string(),
  },
  handler: async (ctx, { sessionId, error }) => {
    const session = await ctx.db.get(sessionId);

    if (!session) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    // Log error - in the future, we might store these in a separate errors collection
    console.error(`[Agent Session ${sessionId}] Error:`, error);

    // Update session timestamp
    await ctx.db.patch(sessionId, {
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});
