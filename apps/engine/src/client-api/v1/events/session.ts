import { initSessionRequestSchema } from "@firebuzz/shared-types/events";
import { Hono } from "hono";
import { generateTrackingToken, verifyTrackingToken } from "../../../lib/jwt";
import { getSessionQueueService } from "../../../lib/queue";
import { parseRequest } from "../../../lib/request";
import {
	getCurrentAttribution,
	getCurrentSession,
	getCurrentUserId,
} from "../../../lib/session";
import { formatSessionData } from "../../../lib/tinybird";
import { detectEnvironment } from "../../../utils/environment";
import { generateUniqueId } from "../../../utils/id-generator";

export const sessionRoutes = new Hono<{ Bindings: Env }>()
	.post("/session/init", async (c) => {
		try {
			const body = await c.req.json();
			const sessionData = initSessionRequestSchema.parse(body);

			// Session ID should already exist from landing page serving
			// Extract from request body (sent from client after reading cookie)
			if (!sessionData.session_id) {
				return c.json(
					{
						success: false,
						error: "Session ID is required",
					},
					400,
				);
			}

			// Detect environment based on hostname
			const hostname = c.req.header("host") || "";
			const environmentContext = detectEnvironment(hostname, c.env);

			// For init endpoint, user_id and attribution_id are required
			// The server (landing page route) ensures these cookies exist
			if (!sessionData.user_id || !sessionData.attribution_id) {
				return c.json(
					{
						success: false,
						error: "Missing required user_id or attribution_id",
					},
					400,
				);
			}

			// Get EventTracker DO instance using existing session ID
			const doId = c.env.EVENT_TRACKER.idFromName(sessionData.session_id);
			const eventTracker = c.env.EVENT_TRACKER.get(doId);

			// Initialize session in DO using RPC method with environment context
			const result = await eventTracker.initSession({
				...sessionData,
				environment: environmentContext.environment,
				campaign_environment: environmentContext.campaignEnvironment,
			});

			if (!result.success) {
				return c.json(
					{
						success: false,
						error: result.error || "Failed to initialize session",
					},
					400,
				);
			}

			// Note: Session cookies are set client-side to match landing page domain
			// user_id and attribution_id cookies are already set by the server on page load

			// Generate tracking token for external link forwarding
			const trackingToken = await generateTrackingToken(
				{
					sessionId: result.session_id || sessionData.session_id,
					userId: sessionData.user_id,
					attributionId: sessionData.attribution_id,
					campaignId: sessionData.campaign_id,
					workspaceId: sessionData.workspace_id,
					projectId: sessionData.project_id,
					landingPageId: sessionData.landing_page_id,
					abTestId: sessionData.ab_test_id,
					abTestVariantId: sessionData.ab_test_variant_id,
				},
				c.env.TRACKING_JWT_SECRET,
			);

			return c.json(
				{
					success: true,
					data: {
						session_id: result.session_id || sessionData.session_id,
						tracking_token: trackingToken,
						session_duration_minutes: sessionData.session_timeout_minutes,
					},
				},
				200,
			);
		} catch (error) {
			console.error("Initialize session error:", error);
			return c.json(
				{
					success: false,
					error:
						error instanceof Error ? error.message : "Internal server error",
				},
				500,
			);
		}
	})
	.post("/session/validate", async (c) => {
		try {
			const body = await c.req.json();
			const { session_id } = body;

			// Get EventTracker DO instance for this session
			const doId = c.env.EVENT_TRACKER.idFromName(session_id);
			const eventTracker = c.env.EVENT_TRACKER.get(doId);

			// Validate session with DO using RPC method
			const result = await eventTracker.validateSession(session_id);

			if (!result.success) {
				const reason =
					result.error === "Session not found" ? "not_found" : "expired";

				// When session is expired, generate new session ID for renewal
				if (result.error === "Session expired") {
					const newSessionId = generateUniqueId();
					return c.json(
						{
							valid: false,
							reason: "expired",
							new_session_id: newSessionId, // Provide new session ID
						},
						200,
					);
				}

				return c.json(
					{
						valid: false,
						reason,
					},
					200,
				);
			}

			return c.json(
				{
					valid: true,
					reason: "valid",
					session: result.session,
				},
				200,
			);
		} catch (error) {
			console.error("Validate session error:", error);
			return c.json(
				{
					valid: false,
					reason: "error",
				},
				200,
			);
		}
	})
	.post("/session/flush", async (c) => {
		try {
			const body = await c.req.json();
			const { session_id } = body;

			// Get EventTracker DO instance for this session
			const doId = c.env.EVENT_TRACKER.idFromName(session_id);
			const eventTracker = c.env.EVENT_TRACKER.get(doId);

			// Flush events via DO using RPC method
			const result = await eventTracker.flushEvents(session_id);

			if (!result.success) {
				return c.json(
					{
						success: false,
						error: result.error || "Failed to flush events",
					},
					result.error === "Session not found" ? 404 : 400,
				);
			}

			return c.json(
				{
					success: true,
					data: { flushed_events: result.flushed_events },
				},
				200,
			);
		} catch (error) {
			console.error("Flush events error:", error);
			return c.json(
				{
					success: false,
					error:
						error instanceof Error ? error.message : "Internal server error",
				},
				500,
			);
		}
	})
	.post("/session/renew", async (c) => {
		try {
			const body = await c.req.json();
			const {
				new_session_id,
				campaign_id,
				campaign_slug,
				workspace_id,
				project_id,
				landing_page_id,
				session_timeout_minutes = 30,
				session_context,
			} = body;

			// Detect environment based on hostname
			const hostname = c.req.header("host") || "";
			const environmentContext = detectEnvironment(hostname, c.env);
			const isPreview = environmentContext.campaignEnvironment === "preview";

			// Get campaign config to use correct session and attribution duration
			let campaignConfig: {
				sessionDurationInMinutes?: number;
				attributionPeriodInDays?: number;
			} | null = null;
			let actualSessionDuration = session_timeout_minutes; // fallback to request value
			let attributionDurationDays = 30; // default attribution period

			if (isPreview) {
				// For preview, we can look up by campaign ID directly
				campaignConfig = await c.env.CAMPAIGN.get(
					`campaign:preview:${campaign_id}`,
					{
						type: "json",
					},
				);
			} else {
				// For production, use origin header + campaign slug from request
				const origin = c.req.header("origin") || "";

				if (origin && campaign_slug) {
					try {
						const originUrl = new URL(origin);
						const landingPageHostname = originUrl.hostname; // Use the actual landing page domain from origin
						const campaignKey = `campaign:${landingPageHostname}:${campaign_slug}`;

						campaignConfig = await c.env.CAMPAIGN.get(campaignKey, {
							type: "json",
						});
					} catch (_error) {
						// Silently fail - fallback to default durations
					}
				}
			}

			if (campaignConfig) {
				if (campaignConfig.sessionDurationInMinutes) {
					actualSessionDuration = campaignConfig.sessionDurationInMinutes;
				}
				if (campaignConfig.attributionPeriodInDays) {
					attributionDurationDays = campaignConfig.attributionPeriodInDays;
				}
			}

			// Get user/attribution data from existing cookies (may be expired/missing)
			let userId = getCurrentUserId(c, campaign_id, isPreview);
			let attribution = getCurrentAttribution(c, campaign_id);

			// Try to get AB test data from old session cookie
			const oldSession = getCurrentSession(c, campaign_id);

			// Generate new IDs if cookies are missing/expired
			if (!userId) {
				userId = generateUniqueId();
			}

			if (!attribution) {
				// Generate new attribution data if missing
				attribution = {
					attributionId: generateUniqueId(),
					campaignId: campaign_id,
					createdAt: Date.now(),
				};
			}

			// Initialize new DO session
			const doId = c.env.EVENT_TRACKER.idFromName(new_session_id);
			const eventTracker = c.env.EVENT_TRACKER.get(doId);

			const sessionData = {
				session_id: new_session_id,
				campaign_id,
				workspace_id,
				project_id,
				landing_page_id,
				user_id: userId,
				attribution_id: attribution.attributionId,
				ab_test_id: oldSession?.abTest?.testId || undefined,
				ab_test_variant_id: oldSession?.abTest?.variantId || undefined,
				session_timeout_minutes: actualSessionDuration,
				environment: environmentContext.environment,
				campaign_environment: environmentContext.campaignEnvironment,
			};

			// Initialize DO session
			const result = await eventTracker.initSession(sessionData);

			if (result.success) {
				// Don't set cookies server-side during renewal (cross-domain issue)
				// Instead, return all necessary data for client to set cookies

				// Generate tracking token for the renewed session (including attribution_id)
				const trackingToken = await generateTrackingToken(
					{
						sessionId: new_session_id,
						userId: userId,
						attributionId: attribution.attributionId,
						campaignId: campaign_id,
						workspaceId: workspace_id,
						projectId: project_id,
						landingPageId: landing_page_id,
						abTestId: oldSession?.abTest?.testId,
						abTestVariantId: oldSession?.abTest?.variantId,
					},
					c.env.TRACKING_JWT_SECRET,
				);

				// Track renewed session via queue for analytics (fire and forget)
				c.executionCtx.waitUntil(
					(async () => {
						try {
							const queueService = getSessionQueueService(c.env);

							// Use stored session context if available, otherwise fall back to API request data
							if (session_context) {
								// Use the original session context from localStorage
								const sessionQueueData = formatSessionData({
									timestamp: new Date().toISOString(),
									sessionId: new_session_id,
									attributionId: attribution.attributionId,
									userId: userId,
									projectId: project_id,
									workspaceId: workspace_id,
									campaignId: campaign_id,
									landingPageId: session_context.landingPageId,
									abTestId: session_context.abTestId,
									abTestVariantId: session_context.abTestVariantId,
									utm: session_context.utm,
									geo: session_context.geo,
									device: session_context.device,
									traffic: session_context.traffic,
									localization: session_context.localization,
									bot: session_context.bot,
									network: session_context.network,
									session: {
										isReturning: true, // Renewal means it's a returning session
										campaignEnvironment:
											session_context.session.campaignEnvironment,
										environment: session_context.session.environment,
										uri: session_context.session.uri,
										fullUri: session_context.session.fullUri,
									},
								});
								await queueService.enqueue(sessionQueueData);
							} else {
								// Fallback to API request data (the old way)
								const requestData = parseRequest(c);
								const sessionQueueData = formatSessionData({
									timestamp: new Date().toISOString(),
									sessionId: new_session_id,
									attributionId: attribution.attributionId,
									userId: userId,
									projectId: project_id,
									workspaceId: workspace_id,
									campaignId: campaign_id,
									landingPageId: landing_page_id, // Use the correct landing page ID from session
									abTestId: oldSession?.abTest?.testId || null,
									abTestVariantId: oldSession?.abTest?.variantId || null,
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
										isReturning: true, // Renewal means it's a returning session
										campaignEnvironment: environmentContext.campaignEnvironment,
										environment: requestData.firebuzz.environment,
										uri: requestData.firebuzz.uri,
										fullUri: requestData.firebuzz.fullUri,
									},
								});
								await queueService.enqueue(sessionQueueData);
							}
						} catch (error) {
							console.error("Failed to queue renewed session data:", error);
						}
					})(),
				);

				return c.json(
					{
						success: true,
						data: {
							session_id: new_session_id,
							tracking_token: trackingToken,
							session_duration_minutes: actualSessionDuration,
							attribution_duration_days: attributionDurationDays,
							user_id: userId,
							attribution_id: attribution.attributionId,
							ab_test_id: oldSession?.abTest?.testId || undefined,
							ab_test_variant_id: oldSession?.abTest?.variantId || undefined,
						},
					},
					200,
				);
			}

			return c.json(
				{
					success: false,
					error: "Failed to renew session",
				},
				400,
			);
		} catch (error) {
			console.error("Session renewal error:", error);
			return c.json(
				{
					success: false,
					error:
						error instanceof Error ? error.message : "Internal server error",
				},
				500,
			);
		}
	})
	.post("/session/verify-token", async (c) => {
		try {
			const body = await c.req.json();
			const { token } = body;

			if (!token) {
				return c.json(
					{
						success: false,
						error: "Token is required",
					},
					400,
				);
			}

			// Verify the tracking token
			const payload = await verifyTrackingToken(
				token,
				c.env.TRACKING_JWT_SECRET,
			);

			if (!payload) {
				return c.json(
					{
						success: false,
						error: "Invalid or expired token",
					},
					401,
				);
			}

			// Return the decoded session and campaign data
			return c.json(
				{
					success: true,
					data: {
						sessionId: payload.sessionId,
						userId: payload.userId,
						campaignId: payload.campaignId,
						workspaceId: payload.workspaceId,
						projectId: payload.projectId,
						landingPageId: payload.landingPageId,
						abTestId: payload.abTestId,
						abTestVariantId: payload.abTestVariantId,
						timestamp: payload.timestamp,
						expiresAt: payload.exp,
					},
				},
				200,
			);
		} catch (error) {
			console.error("Token verification error:", error);
			return c.json(
				{
					success: false,
					error:
						error instanceof Error ? error.message : "Internal server error",
				},
				500,
			);
		}
	});
