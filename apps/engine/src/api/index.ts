import { OpenAPIHono } from '@hono/zod-openapi';
import { apiAuth } from '../middleware';
import { kvRoute } from './v1/kv/assets';
const apiRoutes = new OpenAPIHono<{ Bindings: Env }>();

//@route /api/v1/kv/assets - Manage KV Assets
apiRoutes.use(apiAuth).route('/kv/assets', kvRoute);

export { apiRoutes };
