import { evaluateGDPRSettings } from "@/lib/gdpr";
import type { CampaignConfig } from "@firebuzz/shared-types/campaign";
import { Hono } from "hono";
import { evaluateCampaign } from "../../lib/campaign";
import { parseRequest } from "../../lib/request";
import { ensureSession } from "../../lib/session";
import { selectVariantByWeight } from "../../utils/variant-selection";

const app = new Hono<{ Bindings: Env }>();

// Preview [Campaign] - supports both campaign slug and campaign ID
app.get("/:campaignId", async (c) => {
	const campaignId = c.req.param("campaignId");

	// Log initial page load cookie debug info
	const cookieHeader = c.req.header("cookie");
	console.log("Initial page load cookie debug:", {
		url: c.req.url,
		host: c.req.header("host"),
		user_agent: c.req.header("user-agent")?.substring(0, 100),
		cookies_received: cookieHeader || "NO COOKIES",
		campaign_id: campaignId,
		timestamp: new Date().toISOString(),
	});

	// Get preview campaign configuration
	const config = await c.env.CAMPAIGN.get<CampaignConfig>(
		`campaign:preview:${campaignId}`,
		{
			type: "json",
		},
	);

	if (!config) {
		return c.redirect("/utility/campaign-not-found");
	}

	// Get GDPR Settings (same as production)
	const gdprSettings = evaluateGDPRSettings(c, config.gdpr);

	// Ensure session; then evaluate with that session (preview mode)
	const { session, userId, isExistingSession } = await ensureSession(
		c,
		config,
		true,
	);

	const evaluation = evaluateCampaign(c, config, session, isExistingSession);

	// Parse request data for bot detection and other context data
	const requestData = parseRequest(c);

	// Determine landing page ID based on evaluation type
	let landingPageId: string | undefined;
	let abTestId: string | null = null;
	let abTestVariantId: string | null = null;

	if (evaluation.type === "abtest" && evaluation.abTest) {
		// For AB tests, we need to select or retrieve the variant
		let variantId: string;

		if (
			isExistingSession &&
			session.abTest?.variantId &&
			session.abTest.testId === evaluation.abTest.id &&
			evaluation.abTest.variants.some(
				(v) => v.id === session?.abTest?.variantId,
			) // Check if variant is still in the test
		) {
			// Existing session - use existing variant
			variantId = session.abTest.variantId;
		} else {
			// New user - use weighted randomness instead of Durable Object
			try {
				variantId = selectVariantByWeight(evaluation.abTest.variants);
			} catch (error) {
				console.error(
					"Failed to select variant using weighted randomness:",
					error,
				);
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
		const selectedVariant = evaluation.abTest.variants.find(
			(v) => v.id === variantId,
		);
		landingPageId =
			selectedVariant?.landingPageId ||
			evaluation.matchedSegment?.primaryLandingPageId;
	} else if (evaluation.landingPageId) {
		// Regular segment or default scenario
		landingPageId = evaluation.landingPageId;
	} else if (config.defaultLandingPageId) {
		// Fallback to campaign default
		landingPageId = config.defaultLandingPageId;
	}

	// Check if we have a landing page to serve
	if (!landingPageId) {
		console.error("No landing page ID found for evaluation:", evaluation);
		return c.redirect("/utility/landing-not-found");
	}

	// Fetch the landing page HTML from KV - use preview key for preview campaigns
	const html = await c.env.ASSETS.get(`landing:preview:${landingPageId}`);

	if (!html) {
		console.error("Landing page not found in KV:", landingPageId);
		return c.redirect("/utility/landing-not-found");
	}

	// Store session context for analytics package (only for new sessions) - same as production
	let finalHtml = html;
	if (!isExistingSession) {
		const sessionContext = {
			abTestId: abTestId,
			abTestVariantId: abTestVariantId,
			landingPageId,
			workspaceId: config.workspaceId,
			projectId: config.projectId,
			campaignId: config.campaignId,
			userId,
			session,
			gdprSettings,
			campaignEnvironment: "preview",
			// Base API URL based on worker environment
			apiBaseUrl:
				c.env.ENVIRONMENT === "production"
					? "https://engine.frbzz.com"
					: c.env.ENVIRONMENT === "preview"
						? "https://engine-preview.frbzz.com"
						: "https://engine-dev.frbzz.com",
			// Bot detection data from initial page load
			botDetection: {
				score: requestData.bot?.score || 0,
				corporateProxy: requestData.bot?.corporateProxy || false,
				verifiedBot: requestData.bot?.verifiedBot || false,
			},
		};

		// Inject session context into HTML for client-side access
		const contextScript = `<script>window.__FIREBUZZ_SESSION_CONTEXT__ = ${JSON.stringify(sessionContext)};</script>`;
		finalHtml = html.replace("</head>", `${contextScript}</head>`);
	}

	// Session tracking is now handled by analytics package on client-side
	// This ensures proper context and eliminates duplicate session creation

	// Serve the HTML
	return c.html(finalHtml);
});

export { app as previewCampaignApp };
