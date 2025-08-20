import type { Context } from "hono";

// ============================================================================
// Type Definitions
// ============================================================================

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";
export type OS = "Windows" | "macOS" | "Linux" | "Android" | "iOS" | "Unknown";
export type Browser =
	| "Chrome"
	| "Firefox"
	| "Safari"
	| "Edge"
	| "Opera"
	| "Unknown";
export type ConnectionType =
	| "slow-2g"
	| "2g"
	| "3g"
	| "4g"
	| "wifi"
	| "unknown";

export interface BotManagement {
	corporateProxy: boolean;
	verifiedBot: boolean;
	score: number;
}

export interface GeographicalData {
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
}

export interface DeviceData {
	type: DeviceType;
	os: OS;
	browser: Browser;
	browserVersion: string | null;
	isMobile: boolean;
	screenResolution: {
		width: number | null;
		height: number | null;
	};
	connectionType: ConnectionType;
}

export interface LocalizationData {
	language: string | null;
	languages: string[];
}

export interface TrafficData {
	referrer: string | null;
	userAgent: string;
}

export interface UtmParams {
	utm_source?: string;
	utm_medium?: string;
	utm_campaign?: string;
	utm_term?: string;
	utm_content?: string;
}

export interface QueryParams {
	utm: UtmParams;
	custom: Record<string, string>;
}

export interface FirebuzzData {
	environment: string | null;
	isCampaign: boolean;
	domainType: string | null;
	projectId: string | null;
	workspaceId: string | null;
	userHostname: string | null;
	uri: string | null;
	fullUri: string | null;
	realIp: string | null;
	isSSL: boolean;
}

// ============================================================================
// Main Request Data Interface
// ============================================================================

export interface RequestData {
	bot: BotManagement | null;
	geo: GeographicalData;
	device: DeviceData;
	localization: LocalizationData;
	traffic: TrafficData;
	params: QueryParams;
	firebuzz: FirebuzzData;
}

// ============================================================================
// Main Parser Function
// ============================================================================

/**
 * Parse all request data from a Hono context
 * @param c Hono context containing the request
 * @returns Comprehensive request data object with all parsed information
 */
export function parseRequest(c: Context): RequestData {
	const headers = c.req.header();
	const cf = c.req.raw.cf;
	const url = new URL(c.req.url);

	// Parse bot management
	const bot: BotManagement | null = cf?.botManagement
		? (cf.botManagement as BotManagement)
		: null;

	// Parse geographical data
	const geo: GeographicalData = {
		city: cf?.city ? String(cf.city) : null,
		continent: cf?.continent ? String(cf.continent) : null,
		country: cf?.country ? String(cf.country) : null,
		isEUCountry: cf?.isEUCountry === "1",
		latitude: cf?.latitude ? String(cf.latitude) : null,
		longitude: cf?.longitude ? String(cf.longitude) : null,
		postalCode: cf?.postalCode ? String(cf.postalCode) : null,
		region: cf?.region ? String(cf.region) : null,
		regionCode: cf?.regionCode ? String(cf.regionCode) : null,
		timezone: cf?.timezone ? String(cf.timezone) : null,
	};

	// Parse device data
	const device: DeviceData = {
		type: parseDeviceType(headers),
		os: parseOS(headers),
		browser: parseBrowser(headers),
		browserVersion: parseBrowserVersion(headers),
		isMobile:
			headers["sec-ch-ua-mobile"] === "?1" ||
			/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
				headers["user-agent"] || "",
			),
		screenResolution: {
			width: headers["sec-ch-viewport-width"]
				? Number.parseInt(headers["sec-ch-viewport-width"], 10)
				: null,
			height: headers["sec-ch-viewport-height"]
				? Number.parseInt(headers["sec-ch-viewport-height"], 10)
				: null,
		},
		connectionType: parseConnectionType(headers),
	};

	// Parse localization data
	const localization: LocalizationData = parseLocalization(headers);

	// Parse traffic data
	const traffic: TrafficData = {
		referrer: headers.referer || null,
		userAgent: headers["user-agent"] || "",
	};

	// Parse query parameters
	const params: QueryParams = parseQueryParams(url.searchParams);

	// Parse Firebuzz-specific data
	const firebuzz: FirebuzzData = {
		environment: headers["x-environment"] || null,
		isCampaign: headers["x-firebuzz-campaign"] === "true",
		domainType: headers["x-firebuzz-domain-type"] || null,
		projectId: headers["x-project-id"] || null,
		workspaceId: headers["x-workspace-id"] || null,
		userHostname: headers["x-user-hostname"] || null,
		uri: headers["x-uri"] || null,
		fullUri: headers["x-full-uri"] || null,
		realIp: headers["x-real-ip"] || null,
		isSSL: headers["x-ssl"] === "true",
	};

	return {
		bot,
		geo,
		device,
		localization,
		traffic,
		params,
		firebuzz,
	};
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseDeviceType(
	headers: Record<string, string | undefined>,
): DeviceType {
	const userAgent = headers["user-agent"] || "";
	const isMobile =
		headers["sec-ch-ua-mobile"] === "?1" ||
		/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
			userAgent,
		);

	if (!isMobile) {
		return "desktop";
	}

	if (/iPad|Android.*Tablet/i.test(userAgent)) {
		return "tablet";
	}

	return "mobile";
}

function parseOS(headers: Record<string, string | undefined>): OS {
	const secChUaPlatform = headers["sec-ch-ua-platform"]?.replace(/"/g, "");
	const userAgent = headers["user-agent"] || "";

	if (secChUaPlatform) {
		switch (secChUaPlatform) {
			case "Windows":
				return "Windows";
			case "macOS":
				return "macOS";
			case "Linux":
				return "Linux";
			case "Android":
				return "Android";
			case "iOS":
				return "iOS";
		}
	}

	// Fallback to User-Agent parsing
	if (/Windows NT/i.test(userAgent)) {
		return "Windows";
	}
	if (/Mac OS X/i.test(userAgent)) {
		return "macOS";
	}
	if (/Linux/i.test(userAgent)) {
		return "Linux";
	}
	if (/Android/i.test(userAgent)) {
		return "Android";
	}
	if (/iPhone|iPad|iPod/i.test(userAgent)) {
		return "iOS";
	}

	return "Unknown";
}

function parseBrowser(headers: Record<string, string | undefined>): Browser {
	const secChUa = headers["sec-ch-ua"] || "";
	const userAgent = headers["user-agent"] || "";

	// Try sec-ch-ua first
	if (secChUa) {
		if (secChUa.includes("Google Chrome")) return "Chrome";
		if (secChUa.includes("Microsoft Edge")) return "Edge";
		if (secChUa.includes("Firefox")) return "Firefox";
		if (secChUa.includes("Safari")) return "Safari";
	}

	// Fallback to User-Agent
	if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) {
		return "Chrome";
	}
	if (/Edge|Edg/i.test(userAgent)) {
		return "Edge";
	}
	if (/Firefox/i.test(userAgent)) {
		return "Firefox";
	}
	if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
		return "Safari";
	}
	if (/Opera/i.test(userAgent)) {
		return "Opera";
	}

	return "Unknown";
}

function parseBrowserVersion(
	headers: Record<string, string | undefined>,
): string | null {
	const secChUa = headers["sec-ch-ua"] || "";
	const userAgent = headers["user-agent"] || "";

	// Try sec-ch-ua first
	if (secChUa) {
		const chromeMatch = secChUa.match(/"Google Chrome";v="([^"]+)"/);
		const edgeMatch = secChUa.match(/"Microsoft Edge";v="([^"]+)"/);
		const firefoxMatch = secChUa.match(/"Firefox";v="([^"]+)"/);
		const safariMatch = secChUa.match(/"Safari";v="([^"]+)"/);

		if (chromeMatch) return chromeMatch[1];
		if (edgeMatch) return edgeMatch[1];
		if (firefoxMatch) return firefoxMatch[1];
		if (safariMatch) return safariMatch[1];
	}

	// Fallback to User-Agent
	const patterns = [
		/Chrome\/([0-9.]+)/i,
		/(?:Edge|Edg)\/([0-9.]+)/i,
		/Firefox\/([0-9.]+)/i,
		/Version\/([0-9.]+).*Safari/i,
		/Opera\/([0-9.]+)/i,
	];

	for (const pattern of patterns) {
		const match = userAgent.match(pattern);
		if (match) return match[1];
	}

	return null;
}

function parseConnectionType(
	headers: Record<string, string | undefined>,
): ConnectionType {
	if (headers["sec-ch-ua-mobile"] !== "?1") {
		return "wifi"; // Desktop devices likely use wifi
	}

	// Mobile device - try to determine connection from downlink speed
	const downlink = headers.downlink
		? Number.parseFloat(headers.downlink)
		: null;
	if (downlink !== null) {
		if (downlink < 0.15) return "slow-2g";
		if (downlink < 0.75) return "2g";
		if (downlink < 10) return "3g";
		return "4g";
	}

	return "unknown";
}

function parseLocalization(
	headers: Record<string, string | undefined>,
): LocalizationData {
	const acceptLanguage = headers["accept-language"] || "";

	if (!acceptLanguage) {
		return {
			language: null,
			languages: [],
		};
	}

	// Parse Accept-Language: "tr,en;q=0.9,en-US;q=0.8"
	const langEntries = acceptLanguage
		.split(",")
		.map((lang) => {
			const [code, quality] = lang.trim().split(";q=");
			return {
				code: code.trim(),
				quality: quality ? Number.parseFloat(quality) : 1.0,
			};
		})
		.sort((a, b) => b.quality - a.quality);

	return {
		language: langEntries[0]?.code || null,
		languages: langEntries.map((entry) => entry.code),
	};
}

function parseQueryParams(searchParams: URLSearchParams): QueryParams {
	const utm: UtmParams = {};
	const custom: Record<string, string> = {};

	const utmKeys = [
		"utm_source",
		"utm_medium",
		"utm_campaign",
		"utm_term",
		"utm_content",
	] as const;

	searchParams.forEach((value, key) => {
		if (utmKeys.includes(key as keyof UtmParams)) {
			utm[key as keyof UtmParams] = value;
		} else {
			custom[key] = value;
		}
	});

	return { utm, custom };
}
