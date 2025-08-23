import { env } from "cloudflare:workers";
import { Tinybird } from "@chronark/zod-bird";
import { z } from "zod";
import type { EventData } from "@firebuzz/shared-types/events";
import { eventDataSchema } from "@firebuzz/shared-types/events";

// Initialize Tinybird client with global env
// We use cloudflare:workers env for runtime singleton initialization
// while maintaining type safety with our custom Env type
const tinybird = new Tinybird({
	baseUrl: env.TINYBIRD_BASE_URL,
	token: env.TINYBIRD_TOKEN,
});

// Session Schema based on session_v1.datasource
const sessionSchema = z.object({
	timestamp: z.string().datetime(),
	session_id: z.string(),
	attribution_id: z.string(),
	user_id: z.string(),
	project_id: z.string(),
	workspace_id: z.string(),
	campaign_id: z.string(),
	landing_page_id: z.string().nullable().optional(),
	ab_test_id: z.string().nullable().optional(),
	ab_test_variant_id: z.string().nullable().optional(),

	// Attribution data
	utm_source: z.string().nullable().optional(),
	utm_medium: z.string().nullable().optional(),
	utm_campaign: z.string().nullable().optional(),
	utm_term: z.string().nullable().optional(),
	utm_content: z.string().nullable().optional(),

	// Geographic data
	country: z.string(),
	city: z.string(),
	region: z.string(),
	region_code: z.string().nullable().optional(),
	continent: z.string(),
	latitude: z.string().nullable().optional(),
	longitude: z.string().nullable().optional(),
	postal_code: z.string().nullable().optional(),
	timezone: z.string().nullable().optional(),
	is_eu_country: z.number().min(0).max(1),

	// Device data
	device_type: z.string(),
	device_os: z.string(),
	browser: z.string(),
	browser_version: z.string().nullable().optional(),
	is_mobile: z.number().min(0).max(1),
	connection_type: z.string(),

	// Traffic data
	referrer: z.string().nullable().optional(),
	user_agent: z.string(),
	language: z.string().nullable().optional(),
	languages: z.array(z.string()),

	// Bot detection
	is_bot: z.number().min(0).max(1),
	bot_score: z.number().nullable().optional(),
	is_corporate_proxy: z.number().min(0).max(1),
	is_verified_bot: z.number().min(0).max(1),

	// Network data
	ip: z.string(),
	is_ssl: z.number().min(0).max(1),
	domain_type: z.string().nullable().optional(),
	user_hostname: z.string().nullable().optional(),

	// Session metadata
	is_returning: z.number().min(0).max(1),
	campaign_environment: z.string(),
	environment: z.string().nullable().optional(),
	uri: z.string().nullable().optional(),
	full_uri: z.string().nullable().optional(),
});

// Build ingest endpoint for sessions
export const ingestSession = tinybird.buildIngestEndpoint({
	datasource: "session_v1",
	event: sessionSchema,
});

// Build ingest endpoint for events
export const ingestEvent = tinybird.buildIngestEndpoint({
	datasource: "events_v1",
	event: eventDataSchema,
});

// Type exports
export type SessionData = z.infer<typeof sessionSchema>;

// Helper to get current timestamp in DateTime64 format
function getDateTime64(): string {
	return new Date().toISOString();
}

/**
 * Send batch of sessions to Tinybird using NDJSON format
 * This is more efficient than individual requests
 */
export async function batchIngestSessions(
	sessions: SessionData[],
	env: Pick<Env, "TINYBIRD_BASE_URL" | "TINYBIRD_TOKEN">,
): Promise<{
	successful_rows: number;
	quarantined_rows: number;
	errors?: string[];
	rateLimitHeaders?: {
		limit?: string;
		remaining?: string;
		reset?: string;
		retryAfter?: string;
	};
}> {
	if (sessions.length === 0) {
		return { successful_rows: 0, quarantined_rows: 0 };
	}

	// Format as NDJSON (newline-delimited JSON)
	const ndjson = sessions.map((session) => JSON.stringify(session)).join("\n");

	// Calculate payload size for monitoring
	const payloadSizeMB = new Blob([ndjson]).size / (1024 * 1024);

	// Warn if payload is large
	if (payloadSizeMB > 5) {
		console.warn(
			`Large batch payload: ${payloadSizeMB.toFixed(2)}MB for ${sessions.length} sessions`,
		);
	}

	const response = await fetch(
		`${env.TINYBIRD_BASE_URL}/v0/events?name=session_v1&wait=true`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.TINYBIRD_TOKEN}`,
				"Content-Type": "application/x-ndjson",
			},
			body: ndjson,
		},
	);

	// Extract rate limit headers for monitoring
	const rateLimitHeaders = {
		limit: response.headers.get("X-RateLimit-Limit") || undefined,
		remaining: response.headers.get("X-RateLimit-Remaining") || undefined,
		reset: response.headers.get("X-RateLimit-Reset") || undefined,
		retryAfter: response.headers.get("Retry-After") || undefined,
	};

	// Handle rate limiting
	if (response.status === 429) {
		const retryAfter = rateLimitHeaders.retryAfter || "60";
		throw new Error(
			`Rate limited by Tinybird. Retry after ${retryAfter} seconds. ` +
				`Limit: ${rateLimitHeaders.limit}, Remaining: ${rateLimitHeaders.remaining}`,
		);
	}

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`Tinybird batch ingestion failed: ${response.status} - ${errorText}`,
		);
	}

	const result = await response.json<{
		successful_rows: number;
		quarantined_rows: number;
	}>();

	return {
		...result,
		rateLimitHeaders,
	};
}

/**
 * Send batch of events to Tinybird using NDJSON format
 * This is more efficient than individual requests for event tracking
 */
export async function batchIngestEvents(
	events: EventData[],
	env: Pick<Env, "TINYBIRD_BASE_URL" | "TINYBIRD_TOKEN">,
): Promise<{
	successful_rows: number;
	quarantined_rows: number;
	errors?: string[];
	rateLimitHeaders?: {
		limit?: string;
		remaining?: string;
		reset?: string;
		retryAfter?: string;
	};
}> {
	if (events.length === 0) {
		return { successful_rows: 0, quarantined_rows: 0 };
	}

	// Format as NDJSON (newline-delimited JSON)
	const ndjson = events.map((event) => JSON.stringify(event)).join("\n");

	// Calculate payload size for monitoring
	const payloadSizeMB = new Blob([ndjson]).size / (1024 * 1024);

	// Warn if payload is large
	if (payloadSizeMB > 5) {
		console.warn(
			`Large batch payload: ${payloadSizeMB.toFixed(2)}MB for ${events.length} events`,
		);
	}

	const response = await fetch(
		`${env.TINYBIRD_BASE_URL}/v0/events?name=events_v1&wait=true`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.TINYBIRD_TOKEN}`,
				"Content-Type": "application/x-ndjson",
			},
			body: ndjson,
		},
	);

	// Extract rate limit headers for monitoring
	const rateLimitHeaders = {
		limit: response.headers.get("X-RateLimit-Limit") || undefined,
		remaining: response.headers.get("X-RateLimit-Remaining") || undefined,
		reset: response.headers.get("X-RateLimit-Reset") || undefined,
		retryAfter: response.headers.get("Retry-After") || undefined,
	};

	// Handle rate limiting
	if (response.status === 429) {
		const retryAfter = rateLimitHeaders.retryAfter || "60";
		throw new Error(
			`Rate limited by Tinybird. Retry after ${retryAfter} seconds. ` +
				`Limit: ${rateLimitHeaders.limit}, Remaining: ${rateLimitHeaders.remaining}`,
		);
	}

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`Tinybird event batch ingestion failed: ${response.status} - ${errorText}`,
		);
	}

	const result = await response.json<{
		successful_rows: number;
		quarantined_rows: number;
	}>();

	return {
		...result,
		rateLimitHeaders,
	};
}

// Helper function to track session
export async function trackSession(params: {
	sessionId: string;
	attributionId: string;
	userId: string;
	projectId: string;
	workspaceId: string;
	campaignId: string;
	landingPageId?: string | null;
	abTest?: {
		testId: string;
		variantId: string;
	} | null;
	requestData: {
		bot: {
			corporateProxy: boolean;
			verifiedBot: boolean;
			score: number;
		} | null;
		geo: {
			city: string | null;
			continent: string | null;
			country: string | null;
			isEUCountry: boolean;
			latitude: string | null;
			longitude: string | null;
			postalCode: string | null;
			region: string | null;
			regionCode: string | null;
			timezone: string | null;
		};
		device: {
			type: string;
			os: string;
			browser: string;
			browserVersion: string | null;
			isMobile: boolean;
			screenResolution: {
				width: number | null;
				height: number | null;
			};
			connectionType: string;
		};
		localization: {
			language: string | null;
			languages: string[];
		};
		traffic: {
			referrer: string | null;
			userAgent: string;
		};
		params: {
			utm: {
				utm_source?: string;
				utm_medium?: string;
				utm_campaign?: string;
				utm_term?: string;
				utm_content?: string;
			};
		};
		firebuzz: {
			environment: string | null;
			domainType: string | null;
			userHostname: string | null;
			uri: string | null;
			fullUri: string | null;
			realIp: string | null;
			isSSL: boolean;
		};
	};
	isReturningUser: boolean;
}): Promise<void> {
	const { requestData } = params;

	const sessionData: SessionData = {
		timestamp: getDateTime64(),
		session_id: params.sessionId,
		attribution_id: params.attributionId,
		user_id: params.userId,
		project_id: params.projectId,
		workspace_id: params.workspaceId,
		campaign_id: params.campaignId,
		landing_page_id: params.landingPageId ?? null,
		ab_test_id: params.abTest?.testId ?? null,
		ab_test_variant_id: params.abTest?.variantId ?? null,

		// Attribution
		utm_source: requestData.params.utm.utm_source ?? null,
		utm_medium: requestData.params.utm.utm_medium ?? null,
		utm_campaign: requestData.params.utm.utm_campaign ?? null,
		utm_term: requestData.params.utm.utm_term ?? null,
		utm_content: requestData.params.utm.utm_content ?? null,

		// Geographic
		country: requestData.geo.country || "Unknown",
		city: requestData.geo.city || "Unknown",
		region: requestData.geo.region || "Unknown",
		region_code: requestData.geo.regionCode ?? null,
		continent: requestData.geo.continent || "Unknown",
		latitude: requestData.geo.latitude ?? null,
		longitude: requestData.geo.longitude ?? null,
		postal_code: requestData.geo.postalCode ?? null,
		timezone: requestData.geo.timezone ?? null,
		is_eu_country: requestData.geo.isEUCountry ? 1 : 0,

		// Device
		device_type: requestData.device.type,
		device_os: requestData.device.os,
		browser: requestData.device.browser,
		browser_version: requestData.device.browserVersion ?? null,
		is_mobile: requestData.device.isMobile ? 1 : 0,
		connection_type: requestData.device.connectionType,

		// Traffic
		referrer: requestData.traffic.referrer ?? null,
		user_agent: requestData.traffic.userAgent,
		language: requestData.localization.language ?? null,
		languages: requestData.localization.languages,

		// Bot detection
		is_bot: requestData.bot ? 1 : 0,
		bot_score: requestData.bot?.score ?? null,
		is_corporate_proxy: requestData.bot?.corporateProxy ? 1 : 0,
		is_verified_bot: requestData.bot?.verifiedBot ? 1 : 0,

		// Network
		ip: requestData.firebuzz.realIp || "Unknown",
		is_ssl: requestData.firebuzz.isSSL ? 1 : 0,
		domain_type: requestData.firebuzz.domainType ?? null,
		user_hostname: requestData.firebuzz.userHostname ?? null,

		// Session metadata
		is_returning: params.isReturningUser ? 1 : 0,
		campaign_environment: "production",
		environment: requestData.firebuzz.environment ?? null,
		uri: requestData.firebuzz.uri ?? null,
		full_uri: requestData.firebuzz.fullUri ?? null,
	};

	try {
		await ingestSession(sessionData);
	} catch (error) {
		console.error("Failed to track session:", error);
		// Don't throw - we don't want tracking failures to break the request
	}
}

// Helper function to format session data for ingestion
export function formatSessionData(data: {
	timestamp: string;
	sessionId: string;
	attributionId: string;
	userId: string;
	projectId: string;
	workspaceId: string;
	campaignId: string;
	landingPageId?: string | null;
	abTestId?: string | null;
	abTestVariantId?: string | null;
	utm?: {
		source?: string | null;
		medium?: string | null;
		campaign?: string | null;
		term?: string | null;
		content?: string | null;
	};
	geo: {
		country: string | null;
		city: string | null;
		region: string | null;
		regionCode: string | null;
		continent: string | null;
		latitude: string | null;
		longitude: string | null;
		postalCode: string | null;
		timezone: string | null;
		isEUCountry: boolean;
	};
	device: {
		type: string;
		os: string;
		browser: string;
		browserVersion: string | null;
		isMobile: boolean;
		connectionType: string;
	};
	traffic: {
		referrer: string | null;
		userAgent: string;
	};
	localization: {
		language: string | null;
		languages: string[];
	};
	bot?: {
		corporateProxy: boolean;
		verifiedBot: boolean;
		score: number;
	} | null;
	network: {
		ip: string | null;
		isSSL: boolean;
		domainType: string | null;
		userHostname: string | null;
	};
	session: {
		isReturning: boolean;
		campaignEnvironment: "production" | "preview";
		environment: string | null;
		uri: string | null;
		fullUri: string | null;
	};
}): SessionData {
	return {
		timestamp: data.timestamp,
		session_id: data.sessionId,
		attribution_id: data.attributionId,
		user_id: data.userId,
		project_id: data.projectId,
		workspace_id: data.workspaceId,
		campaign_id: data.campaignId,
		landing_page_id: data.landingPageId ?? null,
		ab_test_id: data.abTestId ?? null,
		ab_test_variant_id: data.abTestVariantId ?? null,

		// Attribution
		utm_source: data.utm?.source ?? null,
		utm_medium: data.utm?.medium ?? null,
		utm_campaign: data.utm?.campaign ?? null,
		utm_term: data.utm?.term ?? null,
		utm_content: data.utm?.content ?? null,

		// Geographic
		country: data.geo.country || "Unknown",
		city: data.geo.city || "Unknown",
		region: data.geo.region || "Unknown",
		region_code: data.geo.regionCode ?? null,
		continent: data.geo.continent || "Unknown",
		latitude: data.geo.latitude ?? null,
		longitude: data.geo.longitude ?? null,
		postal_code: data.geo.postalCode ?? null,
		timezone: data.geo.timezone ?? null,
		is_eu_country: data.geo.isEUCountry ? 1 : 0,

		// Device
		device_type: data.device.type,
		device_os: data.device.os,
		browser: data.device.browser,
		browser_version: data.device.browserVersion ?? null,
		is_mobile: data.device.isMobile ? 1 : 0,
		connection_type: data.device.connectionType,

		// Traffic
		referrer: data.traffic.referrer ?? null,
		user_agent: data.traffic.userAgent,
		language: data.localization.language ?? null,
		languages: data.localization.languages,

		// Bot detection
		is_bot: data.bot ? 1 : 0,
		bot_score: data.bot?.score ?? null,
		is_corporate_proxy: data.bot?.corporateProxy ? 1 : 0,
		is_verified_bot: data.bot?.verifiedBot ? 1 : 0,

		// Network
		ip: data.network.ip || "Unknown",
		is_ssl: data.network.isSSL ? 1 : 0,
		domain_type: data.network.domainType ?? null,
		user_hostname: data.network.userHostname ?? null,

		// Session metadata
		is_returning: data.session.isReturning ? 1 : 0,
		campaign_environment: data.session.campaignEnvironment,
		environment: data.session.environment ?? null,
		uri: data.session.uri ?? null,
		full_uri: data.session.fullUri ?? null,
	};
}
