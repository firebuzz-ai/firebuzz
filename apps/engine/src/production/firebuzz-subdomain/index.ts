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

	// Handle AB test scenario with Durable Objects
	if (evaluation.type === 'abtest' && evaluation.abTest) {
		// Get or create visitor ID from cookie
		const cookies = c.req.header('Cookie') || '';
		let visitorId = cookies.match(/visitor_id=([^;]+)/)?.[1];

		if (!visitorId) {
			// Generate new visitor ID
			visitorId = crypto.randomUUID();
		}

		// Get AB Test Durable Object instance
		const abTestId = c.env.AB_TEST.idFromName(`${campaignSlug}-${evaluation.abTest.id}`);
		const abTestDO = c.env.AB_TEST.get(abTestId);

		try {
			// Get variant assignment from Durable Object
			const assignmentUrl = `http://internal/assign-variant?visitorId=${visitorId}`;
			const assignmentResponse = await abTestDO.fetch(assignmentUrl, {
				method: 'GET',
			});

			const assignment = (await assignmentResponse.json()) as {
				variantId: string;
				isNew: boolean;
				landingPageId?: string;
				testStatus?: string;
			};

			// Find the assigned variant
			const assignedVariant = evaluation.abTest.variants.find((v) => v.id === assignment.variantId);
			const landingPageId =
				assignedVariant?.landingPageId || assignment.landingPageId || evaluation.matchedSegment?.primaryLandingPageId;

			if (landingPageId) {
				const html = await c.env.ASSETS.get(`landing:production:${landingPageId}`);
				if (html) {
					// Set visitor ID cookie if new
					if (!cookies.includes('visitor_id=')) {
						c.header('Set-Cookie', `visitor_id=${visitorId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`);
					}

					// Add AB test tracking headers
					c.header('X-AB-Test', evaluation.abTest.id);
					c.header('X-AB-Variant', assignment.variantId);
					c.header('X-AB-Test-Status', assignment.testStatus || 'running');

					return c.html(html);
				}
			}
		} catch (error) {
			console.error('AB Test DO error:', error);
			// Fallback to control variant on error
			const controlVariant = evaluation.abTest.variants.find((v) => v.isControl);
			const landingPageId = controlVariant?.landingPageId || evaluation.matchedSegment?.primaryLandingPageId;

			if (landingPageId) {
				const html = await c.env.ASSETS.get(`landing:production:${landingPageId}`);
				if (html) {
					return c.html(html);
				}
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
