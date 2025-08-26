import { Hono } from "hono";
import { verifyTrackingToken } from "../../../lib/jwt";

export const trackingVerifyRoute = new Hono<{ Bindings: Env }>().post(
	"/tracking/verify",
	async (c) => {
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
	},
);
