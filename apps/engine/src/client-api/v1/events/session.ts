import { initSessionRequestSchema } from "@firebuzz/shared-types/events";
import { Hono } from "hono";
import { verifyTrackingToken } from "../../../lib/jwt";
import { getCurrentSession, getCurrentUserId } from "../../../lib/session";
import { createShortClickId } from "../../../lib/short-tokens";
import { detectEnvironment } from "../../../utils/environment";
import { generateUniqueId } from "../../../utils/id-generator";
import { trackSession } from "./session/track";

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

			// Always use campaign environment from session context (authoritative source)
			const campaignEnvironment = sessionData.campaign_environment || "production";

			// Get engine environment from hostname (for internal tracking)
			const hostname = c.req.header("host") || "";
			const environmentContext = detectEnvironment(hostname, c.env);

			// For init endpoint, user_id and attribution_id are required
			// The server (landing page route) ensures these cookies exist
			if (!sessionData.user_id) {
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
				campaign_environment: campaignEnvironment, // Use determined campaign environment
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

			// Create short click ID for external link forwarding
			const clickId = await createShortClickId(
				{
					sessionId: result.session_id || sessionData.session_id,
					userId: sessionData.user_id,
					campaignId: sessionData.campaign_id,
					workspaceId: sessionData.workspace_id,
					projectId: sessionData.project_id,
					landingPageId: sessionData.landing_page_id,
					abTestId: sessionData.ab_test_id,
					abTestVariantId: sessionData.ab_test_variant_id,
					timestamp: Date.now(),
					environment: environmentContext.environment,
					campaignEnvironment: campaignEnvironment,
				},
				c.env,
			);

			return c.json(
				{
					success: true,
					data: {
						session_id: result.session_id || sessionData.session_id,
						click_id: clickId,
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
				user_id,
				original_hostname,
			} = body;

			// Validate required parameters
			if (
				!new_session_id ||
				!campaign_id ||
				!workspace_id ||
				!project_id ||
				!landing_page_id
			) {
				console.error("Session renewal validation failed:", {
					new_session_id: !!new_session_id,
					campaign_id: !!campaign_id,
					workspace_id: !!workspace_id,
					project_id: !!project_id,
					landing_page_id: !!landing_page_id,
					campaign_slug: !!campaign_slug,
					user_id: !!user_id,
				});
				return c.json(
					{
						success: false,
						error:
							"Missing required parameters: new_session_id, campaign_id, workspace_id, project_id, and landing_page_id are required",
					},
					400,
				);
			}

			// Detect environment based on original hostname (where user actually is) or fallback to request hostname
			const detectionHostname = original_hostname || c.req.header("host") || "";
			const environmentContext = detectEnvironment(detectionHostname, c.env);

			console.log("Session renewal environment detection:", {
				original_hostname,
				request_hostname: c.req.header("host"),
				detection_hostname: detectionHostname,
				detected_environment: environmentContext,
			});
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

			// Use provided user_id from request (client should send existing user ID)
			let userId = user_id;

			// Fallback: try to get from cookies if not provided (backward compatibility)
			if (!userId) {
				userId = getCurrentUserId(c, campaign_id, isPreview);
				console.log(
					"Session renewal: No user_id provided, attempted cookie fallback:",
					{
						found_userId: userId || "NONE",
						note: "Cross-domain cookies don't work, client should send user_id",
					},
				);
			} else {
				console.log("Session renewal: Using provided user_id:", userId);
			}

			// Try to get AB test data from old session cookie
			const oldSession = getCurrentSession(c, campaign_id);

			// Generate new ID only as last resort
			if (!userId) {
				userId = generateUniqueId();
				console.log(
					"Session renewal: No user ID provided or found, generating new:",
					userId,
				);
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
				ab_test_id: oldSession?.abTest?.testId || undefined,
				ab_test_variant_id: oldSession?.abTest?.variantId || undefined,
				session_timeout_minutes: actualSessionDuration,
				environment: environmentContext.environment,
				campaign_environment: environmentContext.campaignEnvironment,
			};

			// Initialize DO session
			console.log("Attempting to initialize DO session for renewal:", {
				session_id: new_session_id,
				campaign_id,
				workspace_id,
				project_id,
				user_id: userId,
			});
			const result = await eventTracker.initSession(sessionData);

			if (result.success) {
				// Don't set cookies server-side during renewal (cross-domain issue)
				// Instead, return all necessary data for client to set cookies

				// Create short click ID for the renewed session (including attribution_id)
				const clickId = await createShortClickId(
					{
						sessionId: new_session_id,
						userId: userId,
						campaignId: campaign_id,
						workspaceId: workspace_id,
						projectId: project_id,
						landingPageId: landing_page_id,
						abTestId: oldSession?.abTest?.testId,
						abTestVariantId: oldSession?.abTest?.variantId,
						timestamp: Date.now(),
						environment: environmentContext.environment,
						campaignEnvironment: environmentContext.campaignEnvironment,
					},
					c.env,
				);

				// Session tracking is now handled by analytics package via /session/track endpoint
				// This eliminates duplicate session records

				return c.json(
					{
						success: true,
						data: {
							session_id: new_session_id,
							click_id: clickId,
							session_duration_minutes: actualSessionDuration,
							attribution_duration_days: attributionDurationDays,
							user_id: userId,
							ab_test_id: oldSession?.abTest?.testId || undefined,
							ab_test_variant_id: oldSession?.abTest?.variantId || undefined,
						},
					},
					200,
				);
			}

			console.error("Session renewal DO initialization failed:", {
				session_id: new_session_id,
				do_result: result,
				error: result.error,
			});
			return c.json(
				{
					success: false,
					error: result.error || "Failed to renew session",
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
	})
	.post("/session/track", trackSession);
