"use node";

import { ConvexError, v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { engineAPIClient } from "../../lib/engine";

/**
 * Initialize Agent Session Durable Object
 * Called when a new session is created with a sandbox
 */
export const initializeAgentSessionDO = internalAction({
  args: {
    sessionId: v.id("agentSessions"),
    maxDuration: v.optional(v.number()),
    maxIdleTime: v.optional(v.number()),
  },
  handler: async (_ctx, { sessionId, maxDuration, maxIdleTime }) => {
    try {
      const response = await engineAPIClient.do[
        "agent-session"
      ].initialize.$post({
        json: {
          sessionId,
          maxDuration: maxDuration || 30 * 60 * 1000, // 30 minutes default
          maxIdleTime: maxIdleTime || 5 * 60 * 1000, // 5 minutes default
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new ConvexError({
          message: "Failed to initialize agent session DO",
          data: { error, status: response.status },
        });
      }

      const data = await response.json();
      console.log("Agent session DO initialized:", data);

      return data;
    } catch (error) {
      console.error("Failed to initialize agent session DO:", error);
      throw error;
    }
  },
});

/**
 * Extend agent session (called when user continues after idle warning)
 */
export const extendAgentSession = internalAction({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (_ctx, { sessionId }) => {
    try {
      const response = await engineAPIClient.do["agent-session"].extend.$post({
        json: {
          sessionId,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new ConvexError({
          message: "Failed to extend agent session",
          data: { error, status: response.status },
        });
      }

      const data = await response.json();
      console.log("Agent session extended:", data);

      return data;
    } catch (error) {
      console.error("Failed to extend agent session:", error);
      throw error;
    }
  },
});

/**
 * Send heartbeat to update activity timestamp in DO
 * Called when user performs actions (chat, edits, etc.)
 */
export const sendHeartbeatToAgentSession = internalAction({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (_ctx, { sessionId }) => {
    try {
      const response = await engineAPIClient.do[
        "agent-session"
      ].heartbeat.$post({
        json: {
          sessionId,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.warn("Failed to send heartbeat:", error);
        return { success: false };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.warn("Failed to send heartbeat:", error);
      return { success: false };
    }
  },
});
