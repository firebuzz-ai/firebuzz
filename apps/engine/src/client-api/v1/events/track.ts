import { Hono } from "hono";
import { trackEventRequestSchema } from "@firebuzz/shared-types/events";
import { generateUniqueId } from "../../../utils/id-generator";

export const trackRoute = new Hono<{ Bindings: Env }>()
	.post("/track", async (c) => {
		try {
			const body = await c.req.json();
			const eventData = trackEventRequestSchema.parse(body);

			// Get EventTracker DO instance for this session
			const doId = c.env.EVENT_TRACKER.idFromName(eventData.session_id);
			const eventTracker = c.env.EVENT_TRACKER.get(doId);

			// Forward event to DO using RPC method
			const result = await eventTracker.trackEvent(eventData);

			if (!result.success) {
				// Handle session expiry with renewal opportunity
				if (result.error === "Session expired") {
					const newSessionId = generateUniqueId();
					return c.json({
						success: false,
						error: "Session expired",
						new_session_id: newSessionId, // Provide new session ID for renewal
					}, 200); // Return 200, not 400, so client can handle gracefully
				}

				return c.json({
					success: false,
					error: result.error || "Failed to track event",
				}, result.error === "Session not found" ? 404 : 400);
			}

			return c.json({
				success: true,
				data: {
					event_sequence: result.event_sequence!,
					events_in_buffer: result.events_in_buffer!,
					flushed_to_tinybird: result.flushed_to_tinybird!,
				},
			}, 200);

		} catch (error) {
			console.error("Track event error:", error);
			return c.json({
				success: false,
				error: error instanceof Error ? error.message : "Internal server error",
			}, 500);
		}
	});