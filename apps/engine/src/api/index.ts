import { OpenAPIHono } from '@hono/zod-openapi';
import { hc } from 'hono/client';
import { cors } from '../middleware';
import { apiAuth } from './../middleware';
import { kvRoute } from './v1/kv/assets';
const apiRoutes = new OpenAPIHono<{ Bindings: Env }>().use(cors).use(apiAuth).route('/kv/assets', kvRoute);

// Export the app routes and the type of the app
type AppType = typeof apiRoutes;
const createClient = (baseUrl = 'http://localhost:8787/api/v1') => {
	return hc<AppType>(`${baseUrl}/api/v1`);
};

export { apiRoutes, createClient, type AppType };
