import type { CampaignConfig } from "@firebuzz/shared-types/campaign";
import { Hono } from "hono";
import { evaluateCampaign } from "../../lib/campaign";
import { getSessionQueueService } from "../../lib/queue";
import { parseRequest } from "../../lib/request";
import {
	ensureSessionAndAttribution,
	updateSessionWithVariant,
} from "../../lib/session";
import { formatSessionData } from "../../lib/tinybird";
import { selectVariantByWeight } from "../../utils/variant-selection";

const app = new Hono<{ Bindings: Env }>();

// Preview [Campaign] - supports both campaign slug and campaign ID
app.get("/:campaignId", async (c) => {
	const campaignId = c.req.param("campaignId");

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

	// Ensure session and attribution; then evaluate with that session (preview mode)
	const { session, attribution, userId, isReturningUser, isExistingSession } =
		ensureSessionAndAttribution(c, config, true);
	const evaluation = evaluateCampaign(c, config, session, isExistingSession);

	// Parse request data for session tracking (will be used later)
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

		// Persist selected or fallback variant into session and update cookie via helper
		updateSessionWithVariant(
			c,
			session,
			config.sessionDurationInMinutes,
			evaluation.abTest.id,
			variantId,
		);

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

		// Add AB test tracking headers
		c.header("X-AB-Test", evaluation.abTest.id);
		c.header("X-AB-Variant", variantId);
		c.header("X-AB-Test-Status", evaluation.abTest.status);
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

	// Add tracking headers for analytics
	if (evaluation.segmentId) {
		c.header("X-Segment-Id", evaluation.segmentId);
	}
	c.header("X-Evaluation-Type", evaluation.type);
	c.header("X-Session-Id", session.sessionId);
	c.header("X-User-Id", userId);
	c.header("X-Is-Returning-User", isReturningUser ? "true" : "false");
	c.header("X-Is-Existing-Session", isExistingSession ? "true" : "false");
	c.header("X-Preview-Mode", "true");

	// Track session via queue for batching and throttling (only for new sessions)
	if (
		!isExistingSession &&
		requestData.firebuzz.projectId &&
		requestData.firebuzz.workspaceId
	) {
		// Fire and forget - enqueue session without blocking response
		c.executionCtx.waitUntil(
			(async () => {
				try {
					const queueService = getSessionQueueService(c.env);
					const sessionData = formatSessionData({
						timestamp: new Date().toISOString(),
						sessionId: session.sessionId,
						attributionId: attribution.attributionId,
						userId: userId,
						projectId: requestData.firebuzz.projectId || "",
						workspaceId: requestData.firebuzz.workspaceId || "",
						campaignId: config.campaignId,
						landingPageId: landingPageId,
						abTestId: abTestId,
						abTestVariantId: abTestVariantId,
						utm: {
							source: requestData.params.utm.utm_source,
							medium: requestData.params.utm.utm_medium,
							campaign: requestData.params.utm.utm_campaign,
							term: requestData.params.utm.utm_term,
							content: requestData.params.utm.utm_content,
						},
						geo: {
							country: requestData.geo.country,
							city: requestData.geo.city,
							region: requestData.geo.region,
							regionCode: requestData.geo.regionCode,
							continent: requestData.geo.continent,
							latitude: requestData.geo.latitude,
							longitude: requestData.geo.longitude,
							postalCode: requestData.geo.postalCode,
							timezone: requestData.geo.timezone,
							isEUCountry: requestData.geo.isEUCountry,
						},
						device: {
							type: requestData.device.type,
							os: requestData.device.os,
							browser: requestData.device.browser,
							browserVersion: requestData.device.browserVersion,
							isMobile: requestData.device.isMobile,
							connectionType: requestData.device.connectionType,
						},
						traffic: {
							referrer: requestData.traffic.referrer,
							userAgent: requestData.traffic.userAgent,
						},
						localization: {
							language: requestData.localization.language,
							languages: requestData.localization.languages,
						},
						bot: requestData.bot,
						network: {
							ip: requestData.firebuzz.realIp,
							isSSL: requestData.firebuzz.isSSL,
							domainType: requestData.firebuzz.domainType,
							userHostname: requestData.firebuzz.userHostname,
						},
						session: {
							isReturning: isReturningUser,
							campaignEnvironment: "preview",
							environment: requestData.firebuzz.environment,
							uri: requestData.firebuzz.uri,
							fullUri: requestData.firebuzz.fullUri,
						},
					});

					await queueService.enqueue(sessionData);
				} catch (error) {
					console.error("Failed to enqueue session:", error);
					// Don't fail the request if tracking fails
				}
			})(),
		);
	}

	// Serve the HTML
	return c.html(html);
});

export { app as previewCampaignApp };
