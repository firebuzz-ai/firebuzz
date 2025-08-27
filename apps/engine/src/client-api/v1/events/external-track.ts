import type { EventData } from '@firebuzz/shared-types/events';
import { externalTrackEventRequestSchema } from '@firebuzz/shared-types/events';
import { Hono } from 'hono';
import { verifyTrackingToken } from '../../../lib/jwt';
import { getEventQueueService } from '../../../lib/queue';
import { generateUniqueId } from '../../../utils/id-generator';

export const externalTrackRoute = new Hono<{ Bindings: Env }>().post('/external-track', async (c) => {
	try {
		const body = await c.req.json();
		const externalEventData = externalTrackEventRequestSchema.parse(body);

		console.log('📥 External track API received event:', {
			event_id: externalEventData.event_id,
			event_value: externalEventData.event_value,
			event_value_currency: externalEventData.event_value_currency,
			timestamp: new Date().toISOString(),
		});

		// Verify the tracking token to get session and campaign data
		const tokenPayload = await verifyTrackingToken(externalEventData.token, c.env.TRACKING_JWT_SECRET);

		if (!tokenPayload) {
			return c.json(
				{
					success: false,
					error: 'Invalid or expired tracking token',
				},
				401,
			);
		}

		console.log('✅ Token verified for external event:', {
			event_id: externalEventData.event_id,
			session_id: tokenPayload.sessionId,
			campaign_id: tokenPayload.campaignId,
		});

		// Create event data for the queue
		const eventData: EventData = {
			timestamp: new Date().toISOString(),
			id: generateUniqueId(),
			event_id: externalEventData.event_id,
			event_value: externalEventData.event_value,
			event_value_currency: externalEventData.event_value_currency,
			event_value_type: externalEventData.event_value_type,
			event_type: 'conversion', // External events are typically conversions
			event_placement: 'external', // Mark as external event

			// Context IDs from token
			user_id: tokenPayload.userId,
			campaign_id: tokenPayload.campaignId,
			session_id: tokenPayload.sessionId,
			attribution_id: tokenPayload.attributionId || '',
			workspace_id: tokenPayload.workspaceId,
			project_id: tokenPayload.projectId,
			landing_page_id: tokenPayload.landingPageId,
			ab_test_id: tokenPayload.abTestId || null,
			ab_test_variant_id: tokenPayload.abTestVariantId || null,

			// Session event sequence - for external events we'll use 0 since we don't track sequences
			session_event_sequence: 0,

			// Environment info - get from token payload
			environment: c.env.ENVIRONMENT === 'development' ? 'dev' : c.env.ENVIRONMENT,
			campaign_environment: tokenPayload.campaignEnvironment,
			page_url: c.req.header('referer') || 'external',
			referrer_url: null,

			// Optional fields - not available for external events
			form_id: null,
			clicked_element: null,
			clicked_url: null,
			page_load_time: null,
			dom_ready_time: null,
			scroll_percentage: null,
			time_on_page: null,
			viewport_width: null,
			viewport_height: null,
			metadata: JSON.stringify({
				source: 'external_tracking_script',
				token_timestamp: tokenPayload.timestamp,
			}),
		};

		// Send event directly to queue (bypass Durable Objects)
		const queueService = getEventQueueService(c.env);

		console.log('🚀 Sending external event to queue:', {
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
					console.log('✅ External event queued successfully:', {
						event_id: eventData.event_id,
						session_id: eventData.session_id,
					});
				} catch (error) {
					console.error('Failed to queue external event:', error);
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
		console.error('External track event error:', error);

		// Handle validation errors
		if (error && typeof error === 'object' && 'issues' in error) {
			return c.json(
				{
					success: false,
					error: 'Invalid request data',
					details: error,
				},
				400,
			);
		}

		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			500,
		);
	}
});
