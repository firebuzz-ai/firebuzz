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
import { getContentType } from "../../utils/assets";

const app = new Hono<{ Bindings: Env }>();

// Index Route
app.get("/:campaignSlug", async (c) => {
	const hostname = c.req.header("X-User-Hostname") || "";
	const campaignSlug = c.req.param("campaignSlug");

	const key = `campaign:${hostname}:${campaignSlug}`;

	const config = await c.env.CAMPAIGN.get<CampaignConfig>(key, {
		type: "json",
	});

	if (!config) {
		console.error("Campaign not found in KV:", key);
		return c.redirect("/utility/campaign-not-found");
	}

	// Ensure session and attribution; then evaluate with that session
	const { session, attribution, userId, isReturningUser, isExistingSession } =
		ensureSessionAndAttribution(c, config);
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
			// New user - use Durable Object to select variant
			try {
				const abTestId = c.env.AB_TEST.idFromName(
					`${config.campaignId}-${evaluation.abTest.id}`,
				);
				const abTestDO = c.env.AB_TEST.get(abTestId);

				// Select variant using DO (DO should already be initialized via API)
				const { variantId: selectedVariantId } = await abTestDO.selectVariant();
				variantId = selectedVariantId;

				// Selection succeeded; cookie will be written after try/catch to also cover fallback
			} catch (error) {
				console.error("Failed to select variant using DO:", error);
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

	// Fetch the landing page HTML from KV
	const html = await c.env.ASSETS.get(`landing:production:${landingPageId}`);

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

	// Store session context for analytics package (only for new sessions)
	let finalHtml = html;
	if (!isExistingSession) {
		const sessionContext = {
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
				campaignEnvironment: "production",
				environment: requestData.firebuzz.environment,
				uri: requestData.firebuzz.uri,
				fullUri: requestData.firebuzz.fullUri,
			},
		};
		c.header("X-Session-Context", JSON.stringify(sessionContext));

		// Inject session context into HTML for client-side access
		const contextScript = `<script>window.__FIREBUZZ_SESSION_CONTEXT__ = ${JSON.stringify(sessionContext)};</script>`;
		finalHtml = html.replace("</head>", `${contextScript}</head>`);
	}

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
							campaignEnvironment: "production",
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
	return c.html(finalHtml);
});

// Assets Route for landing pages (CSS/JS)
app.get("/landing/:landingPageId/assets/:asset", async (c) => {
	const landingPageId = c.req.param("landingPageId");
	const assetName = c.req.param("asset");
	const key = `landing:production:${landingPageId}:assets:${assetName}`;

	const asset = await c.env.ASSETS.get(key);

	if (!asset) {
		return c.text("Not found", 404);
	}

	// Set appropriate content type
	if (assetName === "styles") {
		c.header("Content-Type", "text/css");
	} else if (assetName === "script") {
		c.header("Content-Type", "text/javascript");
	}

	return c.body(asset, 200, {
		"Cache-Control": "public, max-age=31536000, immutable",
	});
});

// Wildcard Route for other nested paths and file assets
app.get("/:campaignSlug/*", async (c) => {
	const campaignSlug = c.req.param("campaignSlug");
	const path = c.req.path;

	// Handle file assets with extensions (images, fonts, etc.)
	if (path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
		const assetKey = `asset:production:${path}`;
		const asset = await c.env.ASSETS.get(assetKey);

		if (asset) {
			// Set appropriate content type based on file extension
			const ext = path.split(".").pop()?.toLowerCase();
			const contentType = getContentType(ext);

			return c.body(asset, 200, {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=31536000, immutable",
			});
		}
	}

	// For non-asset paths, redirect to the main campaign route
	return c.redirect(`/${campaignSlug}`);
});

export { app as productionProjectDomainApp };
