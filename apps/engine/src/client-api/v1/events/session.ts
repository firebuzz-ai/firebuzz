import { Hono } from "hono";
import { 
	initSessionRequestSchema,
} from "@firebuzz/shared-types/events";
import { generateUniqueId } from "../../../utils/id-generator";
import { 
	getCurrentUserId, 
	getCurrentAttribution, 
	getCurrentSession, 
	createSession,
	updateSessionWithVariant
} from "../../../lib/session";
import { generateTrackingToken, verifyTrackingToken } from "../../../lib/jwt";

export const sessionRoutes = new Hono<{ Bindings: Env }>()
	.post("/session/init", async (c) => {
		try {
			const body = await c.req.json();
			const sessionData = initSessionRequestSchema.parse(body);

			// Session ID should already exist from landing page serving
			// Extract from request body (sent from client after reading cookie)
			if (!sessionData.session_id) {
				return c.json({
					success: false,
					error: "Session ID is required",
				}, 400);
			}

			// Get EventTracker DO instance using existing session ID
			const doId = c.env.EVENT_TRACKER.idFromName(sessionData.session_id);
			const eventTracker = c.env.EVENT_TRACKER.get(doId);

			// Initialize session in DO using RPC method
			const result = await eventTracker.initSession(sessionData);

			if (!result.success) {
				return c.json({
					success: false,
					error: result.error || "Failed to initialize session",
				}, 400);
			}

			// Create and set session cookie when initializing from analytics package
			const newSessionCookie = createSession(c, sessionData.campaign_id, sessionData.session_timeout_minutes);

			// If there's AB test data, update the cookie with it
			if (sessionData.ab_test_id && sessionData.ab_test_variant_id) {
				updateSessionWithVariant(
					c,
					newSessionCookie,
					sessionData.session_timeout_minutes,
					sessionData.ab_test_id,
					sessionData.ab_test_variant_id
				);
			}

			// Generate tracking token for external link forwarding
			const trackingToken = await generateTrackingToken({
				sessionId: result.session_id || sessionData.session_id,
				userId: sessionData.user_id,
				campaignId: sessionData.campaign_id,
				workspaceId: sessionData.workspace_id,
				projectId: sessionData.project_id,
				landingPageId: sessionData.landing_page_id,
				abTestId: sessionData.ab_test_id,
				abTestVariantId: sessionData.ab_test_variant_id,
			}, c.env.TRACKING_JWT_SECRET);

			return c.json({
				success: true,
				data: {
					session_id: result.session_id || sessionData.session_id,
					tracking_token: trackingToken,
				},
			}, 200);

		} catch (error) {
			console.error("Initialize session error:", error);
			return c.json({
				success: false,
				error: error instanceof Error ? error.message : "Internal server error",
			}, 500);
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
				const reason = result.error === "Session not found" ? "not_found" : "expired";
				
				// When session is expired, generate new session ID for renewal
				if (result.error === "Session expired") {
					const newSessionId = generateUniqueId();
					return c.json({
						valid: false,
						reason: "expired",
						new_session_id: newSessionId, // Provide new session ID
					}, 200);
				}
				
				return c.json({
					valid: false,
					reason,
				}, 200);
			}

			return c.json({
				valid: true,
				reason: "valid",
				session: result.session,
			}, 200);

		} catch (error) {
			console.error("Validate session error:", error);
			return c.json({
				valid: false,
				reason: "error",
			}, 200);
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
				return c.json({
					success: false,
					error: result.error || "Failed to flush events",
				}, result.error === "Session not found" ? 404 : 400);
			}

			return c.json({
				success: true,
				data: { flushed_events: result.flushed_events },
			}, 200);

		} catch (error) {
			console.error("Flush events error:", error);
			return c.json({
				success: false,
				error: error instanceof Error ? error.message : "Internal server error",
			}, 500);
		}
	})
	.post("/session/renew", async (c) => {
		try {
			const body = await c.req.json();
			const { 
				new_session_id,
				campaign_id,
				workspace_id,
				project_id,
				landing_page_id,
				session_timeout_minutes = 30
			} = body;

			// Check if this is a preview environment
			const hostname = c.req.header("host") || "";
			const isPreview = hostname.includes('preview.frbzz.com') || 
			                  hostname.startsWith('preview-') && hostname.includes('.frbzz.com');

			// Get user/attribution data from existing cookies
			const userId = getCurrentUserId(c, campaign_id, isPreview);
			const attribution = getCurrentAttribution(c, campaign_id);
			
			// Try to get AB test data from old session cookie
			const oldSession = getCurrentSession(c, campaign_id);
			
			if (!userId || !attribution) {
				return c.json({
					success: false,
					error: "Missing required cookie data for session renewal"
				}, 400);
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
				session_timeout_minutes
			};

			// Initialize DO session
			const result = await eventTracker.initSession(sessionData);

			if (result.success) {
				// Create and set new session cookie - this is the key part!
				const newSessionCookie = createSession(c, campaign_id, session_timeout_minutes);

				// If there was AB test data, update the cookie with it
				if (oldSession?.abTest?.testId && oldSession?.abTest?.variantId) {
					updateSessionWithVariant(
						c,
						newSessionCookie,
						session_timeout_minutes,
						oldSession.abTest.testId,
						oldSession.abTest.variantId
					);
				}

				// Generate tracking token for the renewed session
				const trackingToken = await generateTrackingToken({
					sessionId: new_session_id,
					userId: userId,
					campaignId: campaign_id,
					workspaceId: workspace_id,
					projectId: project_id,
					landingPageId: landing_page_id,
					abTestId: oldSession?.abTest?.testId,
					abTestVariantId: oldSession?.abTest?.variantId,
				}, c.env.TRACKING_JWT_SECRET);

				return c.json({
					success: true,
					data: { 
						session_id: new_session_id,
						tracking_token: trackingToken,
					}
				}, 200);
			}

			return c.json({
				success: false,
				error: "Failed to renew session"
			}, 400);

		} catch (error) {
			console.error("Session renewal error:", error);
			return c.json({
				success: false,
				error: error instanceof Error ? error.message : "Internal server error"
			}, 500);
		}
	})
	.post("/session/verify-token", async (c) => {
		try {
			const body = await c.req.json();
			const { token } = body;

			if (!token) {
				return c.json({
					success: false,
					error: "Token is required"
				}, 400);
			}

			// Verify the tracking token
			const payload = await verifyTrackingToken(token, c.env.TRACKING_JWT_SECRET);

			if (!payload) {
				return c.json({
					success: false,
					error: "Invalid or expired token"
				}, 401);
			}

			// Return the decoded session and campaign data
			return c.json({
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
				}
			}, 200);

		} catch (error) {
			console.error("Token verification error:", error);
			return c.json({
				success: false,
				error: error instanceof Error ? error.message : "Internal server error"
			}, 500);
		}
	});