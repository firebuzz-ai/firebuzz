import type { CampaignConfig } from '@firebuzz/shared-types/campaign';
import { Hono } from 'hono';
import { evaluateCampaign } from '../../lib/campaign';
import { evaluateGDPRSettings } from '../../lib/gdpr';
import { parseRequest } from '../../lib/request';
import { ensureSession } from '../../lib/session';
import { getContentType } from '../../utils/assets';

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

	// Get GDPR Settings (same as other routes)
	const gdprSettings = evaluateGDPRSettings(c, config.gdpr);

	// Ensure session; then evaluate with that session
	const { session, userId, isExistingSession } = await ensureSession(c, config);
	const evaluation = evaluateCampaign(c, config, session, isExistingSession);

	// Parse request data for session tracking (will be used later)
	const requestData = parseRequest(c);

	// Determine landing page ID based on evaluation type
	let landingPageId: string | undefined;
	let abTestId: string | null = null;
	let abTestVariantId: string | null = null;

	if (evaluation.type === 'abtest' && evaluation.abTest) {
		// For AB tests, we need to select or retrieve the variant
		let variantId: string;

		if (
			isExistingSession &&
			session.abTest?.variantId &&
			session.abTest.testId === evaluation.abTest.id &&
			evaluation.abTest.variants.some((v) => v.id === session?.abTest?.variantId) // Check if variant is still in the test
		) {
			// Existing session - use existing variant
			variantId = session.abTest.variantId;
		} else {
			// New user - use Durable Object to select variant
			try {
				const abTestId = c.env.AB_TEST.idFromName(`${config.campaignId}-${evaluation.abTest.id}`);
				const abTestDO = c.env.AB_TEST.get(abTestId);

				// Select variant using DO (DO should already be initialized via API)
				const { variantId: selectedVariantId } = await abTestDO.selectVariant();
				variantId = selectedVariantId;

				// Selection succeeded; cookie will be written after try/catch to also cover fallback
			} catch (error) {
				console.error('Failed to select variant using DO:', error);
				// Fallback to first variant
				variantId = evaluation.abTest.variants[0].id;
			}
		}

		// Persist selected variant into session (no cookie setting in engine)
		session.abTest = { testId: evaluation.abTest.id, variantId: variantId };

		// Capture AB test data for session tracking
		abTestId = evaluation.abTest.id;
		abTestVariantId = variantId;

		// Get the selected variant
		const selectedVariant = evaluation.abTest.variants.find((v) => v.id === variantId);
		landingPageId = selectedVariant?.landingPageId || evaluation.matchedSegment?.primaryLandingPageId;
	} else if (evaluation.landingPageId) {
		// Regular segment or default scenario
		landingPageId = evaluation.landingPageId;
	} else if (config.defaultLandingPageId) {
		// Fallback to campaign default
		landingPageId = config.defaultLandingPageId;
	}

	// Check if we have a landing page to serve
	if (!landingPageId) {
		console.error('No landing page ID found for evaluation:', evaluation);
		return c.redirect('/utility/landing-not-found');
	}

	// Fetch the landing page HTML from KV
	const html = await c.env.ASSETS.get(`landing:production:${landingPageId}`);

	if (!html) {
		console.error('Landing page not found in KV:', landingPageId);
		return c.redirect('/utility/landing-not-found');
	}

	// Store session context for analytics package (only for new sessions) - same as other routes
	let finalHtml = html;
	if (!isExistingSession) {
		const sessionContext = {
			abTestId: abTestId,
			abTestVariantId: abTestVariantId,
			userId,
			session,
			workspaceId: config.workspaceId,
			projectId: config.projectId,
			campaignId: config.campaignId,
			landingPageId,
			gdprSettings,
			campaignEnvironment: 'production',
			// Base API URL based on worker environment
			apiBaseUrl:
				c.env.ENVIRONMENT === 'production'
					? 'https://engine.frbzz.com'
					: c.env.ENVIRONMENT === 'preview'
						? 'https://engine-preview.frbzz.com'
						: 'https://engine-dev.frbzz.com',
			// Bot detection data from initial page load
			botDetection: {
				score: requestData.bot?.score || 0,
				corporateProxy: requestData.bot?.corporateProxy || false,
				verifiedBot: requestData.bot?.verifiedBot || false,
			},
		};

		// Inject session context into HTML for client-side access
		const contextScript = `<script>window.__FIREBUZZ_SESSION_CONTEXT__ = ${JSON.stringify(sessionContext)};</script>`;
		finalHtml = html.replace('</head>', `${contextScript}</head>`);
	}

	// Serve the HTML
	return c.html(finalHtml);
});

// Assets Route for landing pages (CSS/JS) - MUST BE BEFORE WILDCARD
app.get('/landing/:landingPageId/assets/:asset', async (c) => {
	const landingPageId = c.req.param('landingPageId');
	const assetName = c.req.param('asset');
	const key = `landing:production:${landingPageId}:assets:${assetName}`;

	const asset = await c.env.ASSETS.get(key);

	if (!asset) {
		return c.text('Not found', 404);
	}

	// Set appropriate content type
	if (assetName === 'styles') {
		c.header('Content-Type', 'text/css');
	} else if (assetName === 'script') {
		c.header('Content-Type', 'text/javascript');
	}

	return c.body(asset, 200, {
		'Cache-Control': 'public, max-age=31536000, immutable',
	});
});

// Wildcard Route for other nested paths and file assets
app.get('/:campaignSlug/*', async (c) => {
	const campaignSlug = c.req.param('campaignSlug');
	const path = c.req.path;

	// Handle file assets with extensions (images, fonts, etc.)
	if (path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
		const assetKey = `asset:production:${path}`;
		const asset = await c.env.ASSETS.get(assetKey);

		if (asset) {
			// Set appropriate content type based on file extension
			const ext = path.split('.').pop()?.toLowerCase();
			const contentType = getContentType(ext);

			return c.body(asset, 200, {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000, immutable',
			});
		}
	}

	// For non-asset paths, redirect to the main campaign route
	return c.redirect(`/${campaignSlug}`);
});

// Root route - handles redirect to main site
app.get('/', async (c) => {
	return c.redirect('https://getfirebuzz.com', 301);
});

export { app as productionCustomDomainApp };
