import { Hono } from "hono";
import { 
	initSessionRequestSchema,
} from "@firebuzz/shared-types/events";

export const sessionRoutes = new Hono<{ Bindings: Env }>()
	.post("/session/init", async (c) => {
		try {
			const body = await c.req.json();
			const sessionData = initSessionRequestSchema.parse(body);

			// Session ID should already exist from landing page serving
			// Extract from request body (sent from client after reading cookie)
			if (!sessionData.session_id) {
				return c.json({
					success: false,
					error: "Session ID is required",
				}, 400);
			}

			// Get EventTracker DO instance using existing session ID
			const doId = c.env.EVENT_TRACKER.idFromName(sessionData.session_id);
			const eventTracker = c.env.EVENT_TRACKER.get(doId);

			// Initialize session in DO using RPC method
			const result = await eventTracker.initSession(sessionData);

			if (!result.success) {
				return c.json({
					success: false,
					error: result.error || "Failed to initialize session",
				}, 400);
			}

			return c.json({
				success: true,
				data: {
					session_id: result.session_id || sessionData.session_id,
				},
			}, 200);

		} catch (error) {
			console.error("Initialize session error:", error);
			return c.json({
				success: false,
				error: error instanceof Error ? error.message : "Internal server error",
			}, 500);
		}
	})
	.post("/session/validate", async (c) => {
		try {
			const body = await c.req.json();
			const { session_id } = body;

			// Get EventTracker DO instance for this session
			const doId = c.env.EVENT_TRACKER.idFromName(session_id);
			const eventTracker = c.env.EVENT_TRACKER.get(doId);

			// Validate session with DO using RPC method
			const result = await eventTracker.validateSession(session_id);

			if (!result.success) {
				return c.json({
					valid: false,
					reason: result.error === "Session not found" ? "not_found" : "expired",
				}, 200);
			}

			return c.json({
				valid: true,
				reason: "valid",
				session: result.session,
			}, 200);

		} catch (error) {
			console.error("Validate session error:", error);
			return c.json({
				valid: false,
				reason: "error",
			}, 200);
		}
	})
	.post("/session/flush", async (c) => {
		try {
			const body = await c.req.json();
			const { session_id } = body;

			// Get EventTracker DO instance for this session
			const doId = c.env.EVENT_TRACKER.idFromName(session_id);
			const eventTracker = c.env.EVENT_TRACKER.get(doId);

			// Flush events via DO using RPC method
			const result = await eventTracker.flushEvents(session_id);

			if (!result.success) {
				return c.json({
					success: false,
					error: result.error || "Failed to flush events",
				}, result.error === "Session not found" ? 404 : 400);
			}

			return c.json({
				success: true,
				data: { flushed_events: result.flushed_events },
			}, 200);

		} catch (error) {
			console.error("Flush events error:", error);
			return c.json({
				success: false,
				error: error instanceof Error ? error.message : "Internal server error",
			}, 500);
		}
	});