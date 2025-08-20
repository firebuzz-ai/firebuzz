import { OpenAPIHono } from '@hono/zod-openapi';
import type { Env } from '../env';
import { apiAuth, cors } from '../middleware';
import { abTestRoute } from './v1/do/ab-test';
import { assetsRoute } from './v1/kv/assets';
import { cacheRoute } from './v1/kv/cache';
import { campaignRoute } from './v1/kv/campaign';
import { domainConfigRoute } from './v1/kv/domain-config';

const apiRoutes = new OpenAPIHono<{ Bindings: Env }>()
	.use(cors)
	.use(apiAuth)
	.route('/kv/assets', assetsRoute)
	.route('/kv/cache', cacheRoute)
	.route('/kv/domain', domainConfigRoute)
	.route('/kv/campaign', campaignRoute)
	.route('/do/abtest', abTestRoute);

// Export only the type to prevent bundling issues
export type AppType = typeof apiRoutes;

// Export the routes for internal use
export { apiRoutes };
