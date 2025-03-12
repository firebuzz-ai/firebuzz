import { Hono } from 'hono';
import { apiRoutes } from './api';

const app = new Hono<{ Bindings: Env }>();

// API Routes
app.route('/api/v1/', apiRoutes);

// Host
app.get('/:siteid', async (c) => {
	const siteid = c.req.param('siteid');

	const html = await c.env.ASSETS.get(`${siteid}`);

	if (!html) {
		return c.text('Not found', 404);
	}

	return c.html(html);
});

app.get('/:siteid/assets/:asset', async (c) => {
	const siteid = c.req.param('siteid');
	const assetP = c.req.param('asset');

	const asset = await c.env.ASSETS.get(`assets/${siteid}/${assetP}`);

	if (!asset) {
		return c.text('Not found', 404);
	}

	if (assetP === 'styles') {
		c.header('Content-Type', 'text/css');
	}

	if (assetP === 'script') {
		c.header('Content-Type', 'text/javascript');
	}

	return c.body(asset);
});

app.get('/', async (c) => {
	return c.json({
		message: 'Hello Cloudflare Workers!',
	});
});

export default app;
