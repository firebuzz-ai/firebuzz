import { Hono } from 'hono';
import { apiRoutes } from './api';
import { clientApiRoutes } from './client-api';
import type { Env } from './env';
import { parseRequest } from './lib/request';
import { domainRouting } from './middleware';
import { utilityRoutes } from './utility-routes';
import { inngestApp } from './workflows';

const app = new Hono<{ Bindings: Env }>().use(domainRouting);

// Test
app.get('/test', async (c) => {
	const data = parseRequest(c);

	return c.json({
		...data,
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

// Export the Durable Object class
export { ABTestDurableObject } from './durable-objects/ab-test';

export default app;
