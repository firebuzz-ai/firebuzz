import { Hono } from 'hono';
import { apiRoutes } from './api';

const app = new Hono<{ Bindings: Env }>();

// API Routes
app.route('/api/v1/', apiRoutes);

// Health Check

app.get('/', async (c) => {
	return c.json({
		message: 'Hello Cloudflare Workers!',
	});
});

export default app;
