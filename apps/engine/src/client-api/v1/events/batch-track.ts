import { trackEventRequestSchema } from '@firebuzz/shared-types/events';
import { Hono } from 'hono';
import { z } from 'zod';
import { generateUniqueId } from '../../../utils/id-generator';

// Schema for batch track request
const batchTrackRequestSchema = z.object({
	events: z.array(trackEventRequestSchema),
});

export const batchTrackRoute = new Hono<{ Bindings: Env }>().post('/batch-track', async (c) => {
	try {
		const body = await c.req.json();
		const batchData = batchTrackRequestSchema.parse(body);

		if (batchData.events.length === 0) {
			return c.json(
				{
					success: false,
					error: 'No events in batch',
				},
				400,
			);
		}

		// Extract session_id from first event and validate all events have the same session_id
		const sessionId = batchData.events[0].session_id;
		const invalidEvents = batchData.events.filter((event) => event.session_id !== sessionId);

		if (invalidEvents.length > 0) {
			return c.json(
				{
					success: false,
					error: `All events must have the same session_id. Found ${invalidEvents.length} events with different session_id`,
				},
				400,
			);
		}

		console.log('📦 Batch track API received events:', {
			session_id: sessionId,
			event_count: batchData.events.length,
			first_has_ab_test_id: Object.prototype.hasOwnProperty.call(batchData.events[0], 'ab_test_id'),
			first_has_ab_test_variant_id: Object.prototype.hasOwnProperty.call(batchData.events[0], 'ab_test_variant_id'),
			event_ids: batchData.events.map((e) => e.event_id),
			timestamp: new Date().toISOString(),
		});

		// Get EventTracker DO instance for this session
		const doId = c.env.EVENT_TRACKER.idFromName(sessionId);
		const eventTracker = c.env.EVENT_TRACKER.get(doId);

		// Process each event in the batch
		const results = [];
		let allSuccessful = true;
		let firstError = null;

		for (const eventData of batchData.events) {
			console.log('🔄 Processing batch event:', {
				event_id: eventData.event_id,
				event_type: eventData.event_type,
				session_id: sessionId,
				has_ab_test_id: Object.prototype.hasOwnProperty.call(eventData, 'ab_test_id'),
				has_ab_test_variant_id: Object.prototype.hasOwnProperty.call(eventData, 'ab_test_variant_id'),
			});

			const result = await eventTracker.trackEvent(eventData);
			results.push(result);

			if (!result.success) {
				allSuccessful = false;
				if (!firstError) {
					firstError = result.error;
				}

				// Handle session renewal for batch
				if (result.error === 'Session expired') {
					const newSessionId = generateUniqueId();
					return c.json(
						{
							success: false,
							error: 'Session expired',
							new_session_id: newSessionId,
							processed_events: results.length - 1, // Events processed before expiry
						},
						200,
					);
				}
			}
		}

		console.log('✅ Batch processing complete:', {
			session_id: sessionId,
			total_events: batchData.events.length,
			successful_events: results.filter((r) => r.success).length,
			failed_events: results.filter((r) => !r.success).length,
			all_successful: allSuccessful,
		});

		if (!allSuccessful) {
			return c.json(
				{
					success: false,
					error: firstError || 'Some events failed to process',
					results: results,
				},
				400,
			);
		}

		// Return aggregated success response
		const totalEventsInBuffer = results.reduce((sum, r) => sum + (r.events_in_buffer || 0), 0);
		const anyFlushed = results.some((r) => r.flushed_to_tinybird);

		return c.json(
			{
				success: true,
				data: {
					processed_events: results.length,
					events_in_buffer: totalEventsInBuffer,
					flushed_to_tinybird: anyFlushed,
					batch_id: generateUniqueId(), // For tracking purposes
				},
			},
			200,
		);
	} catch (error) {
		console.error('Batch track error:', error);
		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			500,
		);
	}
});
