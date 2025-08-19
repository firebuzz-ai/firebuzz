import { Hono } from 'hono';
import type { Env } from '../env';
import type { ABTest } from '../types/campaign';

const app = new Hono<{ Bindings: Env }>();

/**
 * Initialize an AB test when a campaign is deployed
 */
app.post('/initialize/:campaignSlug/:testId', async (c) => {
	const { campaignSlug, testId } = c.req.param();
	const { config, duration }: { config: ABTest; duration?: number } = await c.req.json();

	// Get AB Test Durable Object instance
	const abTestId = c.env.AB_TEST.idFromName(`${campaignSlug}-${testId}`);
	const abTestDO = c.env.AB_TEST.get(abTestId);

	// Initialize the test
	const response = await abTestDO.fetch(
		new Request('http://internal/initialize', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ config, duration }),
		})
	);

	const result = await response.json();
	return c.json(result, response.status);
});

/**
 * Get AB test statistics
 */
app.get('/stats/:campaignSlug/:testId', async (c) => {
	const { campaignSlug, testId } = c.req.param();

	// Get AB Test Durable Object instance
	const abTestId = c.env.AB_TEST.idFromName(`${campaignSlug}-${testId}`);
	const abTestDO = c.env.AB_TEST.get(abTestId);

	// Get stats
	const response = await abTestDO.fetch(
		new Request('http://internal/stats', {
			method: 'GET',
		})
	);

	const result = await response.json();
	return c.json(result, response.status);
});

/**
 * Record a conversion for a visitor
 */
app.post('/conversion', async (c) => {
	const { campaignSlug, testId, visitorId } = await c.req.json();

	if (!campaignSlug || !testId || !visitorId) {
		return c.json({ error: 'Missing required parameters' }, 400);
	}

	// Get AB Test Durable Object instance
	const abTestId = c.env.AB_TEST.idFromName(`${campaignSlug}-${testId}`);
	const abTestDO = c.env.AB_TEST.get(abTestId);

	// Record conversion
	const response = await abTestDO.fetch(
		new Request('http://internal/record-conversion', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ visitorId }),
		})
	);

	const result = await response.json();
	return c.json(result, response.status);
});

/**
 * Complete an AB test
 */
app.post('/complete/:campaignSlug/:testId', async (c) => {
	const { campaignSlug, testId } = c.req.param();
	const { reason, winnerId } = await c.req.json();

	// Get AB Test Durable Object instance
	const abTestId = c.env.AB_TEST.idFromName(`${campaignSlug}-${testId}`);
	const abTestDO = c.env.AB_TEST.get(abTestId);

	// Complete the test
	const response = await abTestDO.fetch(
		new Request('http://internal/complete', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ reason, winnerId }),
		})
	);

	const result = await response.json();
	return c.json(result, response.status);
});

/**
 * Pause an AB test
 */
app.post('/pause/:campaignSlug/:testId', async (c) => {
	const { campaignSlug, testId } = c.req.param();

	// Get AB Test Durable Object instance
	const abTestId = c.env.AB_TEST.idFromName(`${campaignSlug}-${testId}`);
	const abTestDO = c.env.AB_TEST.get(abTestId);

	// Pause the test
	const response = await abTestDO.fetch(
		new Request('http://internal/pause', {
			method: 'POST',
		})
	);

	const result = await response.json();
	return c.json(result, response.status);
});

/**
 * Resume an AB test
 */
app.post('/resume/:campaignSlug/:testId', async (c) => {
	const { campaignSlug, testId } = c.req.param();

	// Get AB Test Durable Object instance
	const abTestId = c.env.AB_TEST.idFromName(`${campaignSlug}-${testId}`);
	const abTestDO = c.env.AB_TEST.get(abTestId);

	// Resume the test
	const response = await abTestDO.fetch(
		new Request('http://internal/resume', {
			method: 'POST',
		})
	);

	const result = await response.json();
	return c.json(result, response.status);
});

export { app as abTestRoutes };