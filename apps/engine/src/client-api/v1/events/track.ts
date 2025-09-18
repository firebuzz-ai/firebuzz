import { trackEventRequestSchema } from '@firebuzz/shared-types/events';
import { Hono } from 'hono';
import { generateUniqueId } from '../../../utils/id-generator';

export const trackRoute = new Hono<{ Bindings: Env }>().post('/track', async (c) => {
	try {
		const body = await c.req.json();
		const eventData = trackEventRequestSchema.parse(body);

		console.log('📥 Track API received event:', {
			event_id: eventData.event_id,
			event_type: eventData.event_type,
			session_id: eventData.session_id,
			has_ab_test_id: Object.prototype.hasOwnProperty.call(eventData, 'ab_test_id'),
			has_ab_test_variant_id: Object.prototype.hasOwnProperty.call(eventData, 'ab_test_variant_id'),
			timestamp: new Date().toISOString(),
		});

		// Get EventTracker DO instance for this session
		const doId = c.env.EVENT_TRACKER.idFromName(eventData.session_id);
		const eventTracker = c.env.EVENT_TRACKER.get(doId);

		console.log('🔄 Forwarding to Durable Object:', {
			event_id: eventData.event_id,
			doId: doId.toString(),
			session_id: eventData.session_id,
			has_ab_test_id: Object.prototype.hasOwnProperty.call(eventData, 'ab_test_id'),
			has_ab_test_variant_id: Object.prototype.hasOwnProperty.call(eventData, 'ab_test_variant_id'),
		});

		// Forward event to DO using RPC method
		const result = await eventTracker.trackEvent(eventData);

		console.log('✅ DO response:', {
			event_id: eventData.event_id,
			success: result.success,
			event_sequence: result.event_sequence,
			events_in_buffer: result.events_in_buffer,
			flushed_to_tinybird: result.flushed_to_tinybird,
			error: result.error,
		});

		if (!result.success) {
			// Handle session expiry with renewal opportunity
			if (result.error === 'Session expired') {
				const newSessionId = generateUniqueId();
				return c.json(
					{
						success: false,
						error: 'Session expired',
						new_session_id: newSessionId, // Provide new session ID for renewal
					},
					200,
				); // Return 200, not 400, so client can handle gracefully
			}

			return c.json(
				{
					success: false,
					error: result.error || 'Failed to track event',
				},
				result.error === 'Session not found' ? 404 : 400,
			);
		}

		return c.json(
			{
				success: true,
				data: {
					event_sequence: result.event_sequence!,
					events_in_buffer: result.events_in_buffer!,
					flushed_to_tinybird: result.flushed_to_tinybird!,
				},
			},
			200,
		);
	} catch (error) {
		console.error('Track event error:', error);
		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			500,
		);
	}
});
