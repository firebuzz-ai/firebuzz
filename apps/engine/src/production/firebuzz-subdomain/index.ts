import { Hono } from 'hono';
import type { Env } from '../../env';
import { evaluateCampaign } from '../../lib/campaign';
import type { CampaignConfig } from '../../types/campaign';

const app = new Hono<{ Bindings: Env }>();

// Index Route
app.get('/:campaignSlug', async (c) => {
	const hostname = c.req.header('X-User-Hostname') || '';
	const campaignSlug = c.req.param('campaignSlug');

	const key = `campaign:${hostname}:${campaignSlug}`;

	const config = await c.env.CAMPAIGN.get<CampaignConfig>(key, {
		type: 'json',
	});

	if (!config) {
		return c.redirect('/utility/campaign-not-found');
	}

	// Evaluate campaign to determine which segment/landing page to serve
	const evaluation = evaluateCampaign(c, config);

	console.log('Campaign evaluation:', {
		type: evaluation.type,
		segmentId: evaluation.segmentId,
		landingPageId: evaluation.landingPageId,
		abTest: evaluation.abTest?.id,
	});

	// Handle AB test scenario (will be implemented with Durable Objects later)
	if (evaluation.type === 'abtest' && evaluation.abTest) {
		// TODO: Implement AB test variant selection with Durable Objects
		// For now, use the control variant
		const controlVariant = evaluation.abTest.variants.find((v) => v.isControl);
		const landingPageId = controlVariant?.landingPageId || evaluation.matchedSegment?.primaryLandingPageId;

		if (landingPageId) {
			const html = await c.env.ASSETS.get(`landing:production:${landingPageId}`);
			if (html) {
				// Add AB test tracking headers/cookies
				c.header('X-AB-Test', evaluation.abTest.id);
				c.header('X-AB-Variant', controlVariant?.id || 'control');
				return c.html(html);
			}
		}
	}

	// Handle regular segment match or default
	const landingPageId = evaluation.landingPageId;

	if (!landingPageId) {
		console.error('No landing page ID found for evaluation:', evaluation);
		return c.text('No landing page configured', 404);
	}

	console.log('Serving landing page:', landingPageId);

	const html = await c.env.ASSETS.get(`landing:production:${landingPageId}`);

	if (!html) {
		console.error('Landing page not found in KV:', landingPageId);
		return c.text('Landing page not found', 404);
	}

	// Add tracking headers for analytics
	if (evaluation.segmentId) {
		c.header('X-Segment-Id', evaluation.segmentId);
	}
	c.header('X-Evaluation-Type', evaluation.type);

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

export { app as productionProjectDomainApp };
