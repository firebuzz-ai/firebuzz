import { OpenAPIHono } from '@hono/zod-openapi';
import { hc } from 'hono/client';
import type { Env } from '../env';
import { apiAuth, cors } from '../middleware';
import { assetsRoute } from './v1/kv/assets';
import { cacheRoute } from './v1/kv/cache';

const apiRoutes = new OpenAPIHono<{ Bindings: Env }>()
	.use(cors)
	.use(apiAuth)
	.route('/kv/assets', assetsRoute)
	.route('/kv/cache', cacheRoute);

// Export the app routes and the type of the app
type AppType = typeof apiRoutes;
const createClient = ({ baseUrl = 'http://localhost:8787', apiKey }: { baseUrl: string; apiKey: string }) => {
	return hc<AppType>(`${baseUrl}/api/v1`, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	});
};

export { apiRoutes, createClient, type AppType };
