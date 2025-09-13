import {
	GetConsentRequestSchema,
	GetConsentResponseSchema,
	RecordConsentRequestSchema,
	RecordConsentResponseSchema,
} from "@firebuzz/shared-types";
import { OpenAPIHono } from "@hono/zod-openapi";
import { getActiveConsent, recordConsent } from "../../../lib/consent/db";

const consentRecordRoute = new OpenAPIHono<{ Bindings: Env }>();

// Record consent endpoint
consentRecordRoute.openapi(
	{
		method: "post",
		path: "/",
		summary: "Record user consent",
		description: "Record or update consent preferences for a user",
		request: {
			body: {
				content: {
					"application/json": {
						schema: RecordConsentRequestSchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Consent recorded successfully",
				content: {
					"application/json": {
						schema: RecordConsentResponseSchema,
					},
				},
			},
			400: {
				description: "Invalid request",
				content: {
					"application/json": {
						schema: RecordConsentResponseSchema,
					},
				},
			},
			500: {
				description: "Internal server error",
				content: {
					"application/json": {
						schema: RecordConsentResponseSchema,
					},
				},
			},
		},
	},
	async (c) => {
		try {
			const body = c.req.valid("json");
			const db = c.env.CONSENT_DB;

			// Extract IP and user agent from request
			const ip =
				c.req.header("CF-Connecting-IP") ||
				c.req.header("X-Forwarded-For") ||
				undefined;
			const user_agent = c.req.header("User-Agent") || undefined;

			// Record consent in database
			const result = await recordConsent(db, {
				...body,
				ip,
				user_agent,
			});

			const expires_at_iso = result.expires_at
				? new Date(result.expires_at * 1000).toISOString()
				: undefined;

			return c.json({
				success: true,
				consent_id: result.consent_id,
				expires_at: expires_at_iso,
			});
		} catch (error) {
			console.error("Error recording consent:", error);

			return c.json(
				{
					success: false,
					error: "Failed to record consent",
				},
				500,
			);
		}
	},
);

// Get consent endpoint
consentRecordRoute.openapi(
	{
		method: "get",
		path: "/",
		summary: "Get user consent",
		description: "Retrieve current consent preferences for a user",
		request: {
			query: GetConsentRequestSchema,
		},
		responses: {
			200: {
				description: "Consent retrieved successfully",
				content: {
					"application/json": {
						schema: GetConsentResponseSchema,
					},
				},
			},
			404: {
				description: "Consent not found",
				content: {
					"application/json": {
						schema: GetConsentResponseSchema,
					},
				},
			},
			500: {
				description: "Internal server error",
				content: {
					"application/json": {
						schema: GetConsentResponseSchema,
					},
				},
			},
		},
	},
	async (c) => {
		try {
			const query = c.req.valid("query");
			const db = c.env.CONSENT_DB;

			const consent = await getActiveConsent(
				db,
				query.subject_id,
				query.campaign_id,
				query.domain,
			);

			if (!consent) {
				return c.json(
					{
						success: false,
						error: "No active consent found",
					},
					404,
				);
			}

			return c.json({
				success: true,
				consent: {
					id: consent.id,
					workspace_id: consent.workspace_id,
					project_id: consent.project_id,
					campaign_id: consent.campaign_id,
					subject_id: consent.subject_id,
					domain: consent.domain,
					purposes: consent.purposes,
					status: consent.status,
					given_at: consent.given_at,
					expires_at: consent.expires_at,
				},
			});
		} catch (error) {
			console.error("Error getting consent:", error);

			return c.json(
				{
					success: false,
					error: "Failed to retrieve consent",
				},
				500,
			);
		}
	},
);

export { consentRecordRoute };
