import { Hono } from 'hono';
import type { Env } from '../../env';
import type { CampaignConfig } from '../../preview/campaign/types';

const app = new Hono<{ Bindings: Env }>();

// Index Route
app.get('/:campaignSlug', async (c) => {
	const hostname = c.req.header('X-User-Hostname') || '';
	const campaignSlug = c.req.param('campaignSlug');

	const key = `campaign:${hostname}:${campaignSlug}`;

	// Get Campaign Config
	const config = await c.env.CAMPAIGN.get<CampaignConfig>(key, {
		type: 'json',
	});

	if (!config) {
		return c.redirect(`/utility/campaign-not-found/${campaignSlug}`);
	}

	// Check Default Landing Page
	const defaultLandingPageId = config.defaultLandingPageId;

	const html = await c.env.ASSETS.get(`landing:production:${defaultLandingPageId}`);

	if (!html) {
		return c.text('Not found', 404);
	}

	return c.html(html);
});

// Assets Route
app.get('/landing/:landingPageId/assets/:asset', async (c) => {
	const landingPageId = c.req.param('landingPageId');
	const assetP = c.req.param('asset');
	const key = `landing:production:${landingPageId}:assets:${assetP}`;

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

// Root route - handles redirect to main site
app.get('/', async (c) => {
	return c.redirect('https://getfirebuzz.com', 301);
});

export { app as productionCustomDomainApp };
