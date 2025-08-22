import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { apiRoutes } from './api';
import { clientApiRoutes } from './client-api';
import type { Env } from './env';
import { domainRouting } from './middleware';
import { utilityRoutes } from './utility-routes';
import { inngestApp } from './workflows';

const app = new Hono<{ Bindings: Env }>().use(domainRouting);

const clerkTestRoute = new Hono<{ Bindings: Env }>()
	.use(
		cors({
			origin: ['http://localhost:3000', 'https://localhost:3000'],
			credentials: true,
		}),
	)
	.use(async (c, next) => {
		return clerkMiddleware({
			secretKey: c.env.CLERK_SECRET_KEY,
			publishableKey: c.env.CLERK_PUBLISHABLE_KEY,
		})(c, next);
	});

clerkTestRoute.get('/', async (c) => {
	const session = getAuth(c);
	return c.json({
		session,
	});
});

// Test
app.route('/testclerk', clerkTestRoute);

app.get('/test/:campaignSlug/:testId', async (c) => {
	const campaignSlug = c.req.param('campaignSlug');
	const testId = c.req.param('testId');
	const abTestId = c.env.AB_TEST.idFromName(`${campaignSlug}-${testId}`);

	const test = c.env.AB_TEST.get(abTestId);

	const stats = await test.getStats();

	return c.json({
		stats,
	});
});

// Inngest Routes
app.route('/api/workflows', inngestApp);

// Authenticated API Routes
app.route('/api/v1/', apiRoutes);

// Public Client API Routes
app.route('/client-api/v1/', clientApiRoutes);

// Utility Routes
app.route('/utility', utilityRoutes);

app.get('/', async (c) => {
	return c.json({
		message: 'Hello Firebuzz!',
	});
});

// Import and re-export queue handler directly
import { handleSessionQueue } from './queue/session-consumer';

// Export the Durable Object class
export { ABTestDurableObject } from './durable-objects/ab-test';

// Export both fetch and queue handlers in the default export
export default {
	fetch: app.fetch,
	async queue(batch: MessageBatch, env: Env): Promise<void> {
		await handleSessionQueue(batch, env);
	},
};
