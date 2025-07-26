import { Hono } from 'hono';
import type { Env } from '../env';

const app = new Hono<{ Bindings: Env }>();

// Index Route
app.get('/:slug', async (c) => {
	const slug = c.req.param('slug');
	const projectId = c.req.header('X-Project-Id');

	const html = await c.env.ASSETS.get(`production-${projectId}-${slug}`);

	if (!html) {
		return c.text('Not found', 404);
	}

	return c.html(html);
});

// Assets Route
app.get('/:slug/assets/:asset', async (c) => {
	const slug = c.req.param('slug');
	const assetP = c.req.param('asset');
	const projectId = c.req.header('X-Project-Id');

	const asset = await c.env.ASSETS.get(`production-${projectId}-${slug}/assets/${assetP}`);

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

// Root route - handles both subdomain root and redirect
app.get('/', async (c) => {
	const hostname = c.req.header('host') || '';

	// If accessed from preview subdomain, show preview index
	if (hostname === 'preview.getfirebuzz.com') {
		return c.html(`
			<html>
				<head>
					<title>Firebuzz Preview</title>
					<style>
						body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
						h1 { color: #ff6b00; }
						.previews { display: grid; gap: 1rem; }
					</style>
				</head>
				<body>
					<h1>Firebuzz Preview</h1>
					<p>Enter a slug to view a preview</p>
				</body>
			</html>
		`);
	}

	// Otherwise redirect to main site
	return c.redirect('https://getfirebuzz.com');
});

export { app as productionApp };
