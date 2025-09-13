import { getSessionQueueService } from "@/lib/queue";
import { parseRequest } from "@/lib/request";
import { formatSessionData } from "@/lib/tinybird";
import type { Context } from "hono";

interface SessionTrackingData {
	timestamp: string;
	session_id: string;
	user_id: string;
	project_id: string;
	workspace_id: string;
	campaign_id: string;
	landing_page_id: string;
	utm_source?: string | null;
	utm_medium?: string | null;
	utm_campaign?: string | null;
	utm_term?: string | null;
	utm_content?: string | null;
	ref?: string | null;
	source?: string | null;
	referrer?: string;
	user_agent?: string;
	language?: string;
	device_os?: string;
	browser?: string;
	browser_version?: string;
	connection_type?: string;
	country?: string;
	city?: string;
	region?: string;
	region_code?: string | null;
	continent?: string;
	timezone?: string;
	is_eu_country?: number;
	bot_score?: number | null;
	is_corporate_proxy?: number;
	is_verified_bot?: number;
	domain_type?: string;
	uri?: string;
	user_hostname?: string;
	campaign_environment?: string;
	is_ssl?: number;
	is_mobile?: number;
	is_renewal?: number;
	ab_test_id?: string | null;
	ab_test_variant_id?: string | null;
}

export async function trackSession(c: Context) {
	try {
		const data: SessionTrackingData = await c.req.json();

		// Validate required fields
		const requiredFields = [
			"session_id",
			"user_id",
			"project_id",
			"workspace_id",
			"campaign_id",
		];
		for (const field of requiredFields) {
			if (!data[field as keyof SessionTrackingData]) {
				return c.json(
					{
						success: false,
						error: `Missing required field: ${field}`,
					},
					400,
				);
			}
		}

		// Get geo and other data directly from Cloudflare request
		const requestData = parseRequest(c);

		// Format data for Tinybird using server-side geo data from Cloudflare
		const sessionData = formatSessionData({
			timestamp: data.timestamp,
			sessionId: data.session_id,
			userId: data.user_id,
			projectId: data.project_id,
			workspaceId: data.workspace_id,
			campaignId: data.campaign_id,
			landingPageId: data.landing_page_id,
			abTestId: data.ab_test_id,
			abTestVariantId: data.ab_test_variant_id,
			utm: {
				source: data.utm_source,
				medium: data.utm_medium,
				campaign: data.utm_campaign,
				term: data.utm_term,
				content: data.utm_content,
			},
			ref: data.ref,
			source: data.source,
			// Use server-side geo data from Cloudflare
			geo: {
				country: requestData.geo.country || "Unknown",
				city: requestData.geo.city || "Unknown",
				region: requestData.geo.region || "Unknown",
				regionCode: requestData.geo.regionCode || "",
				continent: requestData.geo.continent || "Unknown",
				timezone: requestData.geo.timezone || data.timezone || "UTC",
				isEUCountry: requestData.geo.isEUCountry || false,
			},
			// Use server-side device data from Cloudflare + client data
			device: {
				type: requestData.device.type,
				os: requestData.device.os,
				browser: requestData.device.browser,
				browserVersion: requestData.device.browserVersion,
				isMobile: requestData.device.isMobile,
				connectionType: requestData.device.connectionType,
			},
			traffic: {
				referrer: data.referrer || requestData.traffic.referrer || null,
				userAgent: data.user_agent || requestData.traffic.userAgent || "",
			},
			localization: {
				language: data.language || requestData.localization.language || "en-US",
			},
			// Use bot detection from client (original page load data)
			bot: {
				score: data.bot_score || 0,
				corporateProxy: Boolean(data.is_corporate_proxy),
				verifiedBot: Boolean(data.is_verified_bot),
			},
			network: {
				isSSL: requestData.firebuzz.isSSL,
				domainType: requestData.firebuzz.domainType,
				userHostname: data.user_hostname || requestData.firebuzz.userHostname,
			},
			session: {
				isReturning: Boolean(data.is_renewal),
				campaignEnvironment: (data.campaign_environment || "preview") as
					| "preview"
					| "production",
				environment: requestData.firebuzz.environment,
				uri: data.uri || "",
			},
		});

		// Enqueue session data for processing
		const queueService = getSessionQueueService(c.env);
		await queueService.enqueue(sessionData);

		console.log(
			`Session ${data.is_renewal ? "renewal" : "creation"} tracked:`,
			{
				sessionId: data.session_id,
				userId: data.user_id,
				hostname: data.user_hostname,
				environment: data.campaign_environment,
			},
		);

		return c.json({ success: true });
	} catch (error) {
		console.error("Session tracking error:", error);
		return c.json(
			{
				success: false,
				error: "Internal server error",
			},
			500,
		);
	}
}
