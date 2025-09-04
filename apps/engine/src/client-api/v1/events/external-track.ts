import type { EventData } from "@firebuzz/shared-types/events";
import { externalTrackEventRequestSchema } from "@firebuzz/shared-types/events";
import { Hono } from "hono";
import { getEventQueueService } from "../../../lib/queue";
import { resolveClickId } from "../../../lib/short-tokens";
import { generateUniqueId } from "../../../utils/id-generator";

export const externalTrackRoute = new Hono<{ Bindings: Env }>().post(
	"/external-track",
	async (c) => {
		try {
			const body = await c.req.json();
			const externalEventData = externalTrackEventRequestSchema.parse(body);

			console.log("📥 External track API received event:", {
				click_id: externalEventData.click_id,
				event_id: externalEventData.event_id,
				event_value: externalEventData.event_value,
				event_value_currency: externalEventData.event_value_currency,
				page_url: externalEventData.page_url,
				referrer_url: externalEventData.referrer_url,
				viewport:
					externalEventData.viewport_width && externalEventData.viewport_height
						? `${externalEventData.viewport_width}x${externalEventData.viewport_height}`
						: "unknown",
				timestamp: new Date().toISOString(),
			});

			// Resolve the short click ID to get session data from CACHE KV
			const sessionData = await resolveClickId(
				externalEventData.click_id,
				c.env,
			);

			if (!sessionData) {
				return c.json(
					{
						success: false,
						error: "Invalid or expired click ID",
					},
					401,
				);
			}

			console.log("✅ Click ID resolved for external event:", {
				click_id: externalEventData.click_id,
				event_id: externalEventData.event_id,
				session_id: sessionData.sessionId,
				campaign_id: sessionData.campaignId,
			});

			// Create event data for the queue
			const eventData: EventData = {
				timestamp: new Date().toISOString(),
				id: generateUniqueId(),
				event_id: externalEventData.event_id,
				event_value: externalEventData.event_value,
				event_value_currency: externalEventData.event_value_currency,
				event_value_type: externalEventData.event_value_type,
				event_type: "conversion", // External events are typically conversions
				event_placement: "external", // Mark as external event

				// Context IDs from session data
				user_id: sessionData.userId,
				campaign_id: sessionData.campaignId,
				session_id: sessionData.sessionId,
				attribution_id: sessionData.attributionId,
				workspace_id: sessionData.workspaceId,
				project_id: sessionData.projectId,
				landing_page_id: sessionData.landingPageId,
				ab_test_id: sessionData.abTestId || null,
				ab_test_variant_id: sessionData.abTestVariantId || null,

				// Session event sequence - for external events we'll use 0 since we don't track sequences
				session_event_sequence: 0,

				// Environment info from session data
				environment: sessionData.environment,
				campaign_environment: sessionData.campaignEnvironment,
				page_url:
					externalEventData.page_url || c.req.header("referer") || "external",
				referrer_url: externalEventData.referrer_url || null,

				// Optional fields - some available from external tracking script
				form_id: null,
				clicked_element: null,
				clicked_url: null,
				page_load_time: null,
				dom_ready_time: null,
				scroll_percentage: null,
				time_on_page: null,
				viewport_width: externalEventData.viewport_width || null,
				viewport_height: externalEventData.viewport_height || null,
				metadata: JSON.stringify({
					source: "external_tracking_script",
					click_id: externalEventData.click_id,
					session_timestamp: sessionData.timestamp,
				}),
			};

			// Send event directly to queue (bypass Durable Objects)
			const queueService = getEventQueueService(c.env);

			console.log("🚀 Sending external event to queue:", {
				event_id: eventData.event_id,
				event_value: eventData.event_value,
				event_value_currency: eventData.event_value_currency,
				session_id: eventData.session_id,
				campaign_id: eventData.campaign_id,
			});

			// Fire and forget - queue the event
			c.executionCtx.waitUntil(
				(async () => {
					try {
						await queueService.enqueue(eventData);
						console.log("✅ External event queued successfully:", {
							event_id: eventData.event_id,
							session_id: eventData.session_id,
						});
					} catch (error) {
						console.error("Failed to queue external event:", error);
					}
				})(),
			);

			return c.json(
				{
					success: true,
					data: {
						event_id: eventData.event_id,
						session_id: eventData.session_id,
						campaign_id: eventData.campaign_id,
						queued: true,
					},
				},
				200,
			);
		} catch (error) {
			console.error("External track event error:", error);

			// Handle validation errors
			if (error && typeof error === "object" && "issues" in error) {
				return c.json(
					{
						success: false,
						error: "Invalid request data",
						details: error,
					},
					400,
				);
			}

			return c.json(
				{
					success: false,
					error:
						error instanceof Error ? error.message : "Internal server error",
				},
				500,
			);
		}
	},
);
