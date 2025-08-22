import { Hono } from 'hono';
import type { Env } from '../../env';

const app = new Hono<{ Bindings: Env }>();

// Preview [Landing Page]

// HTML Route
app.get('/:id', async (c) => {
	const id = c.req.param('id');
	const key = `landing:preview:${id}`;

	const html = await c.env.ASSETS.get(key);

	if (!html) {
		return c.redirect(`/utility/landing-not-found/${id}`);
	}

	return c.html(html);
});

// Assets Route (CSS/JS)
app.get('/:id/assets/:asset', async (c) => {
	const id = c.req.param('id');
	const assetP = c.req.param('asset');
	const key = `landing:preview:${id}:assets:${assetP}`;

	const asset = await c.env.ASSETS.get(key);

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

export { app as previewLandingApp };
