/**
 * Environment detection utilities
 */

export interface EnvironmentContext {
	/**
	 * Engine environment: dev, preview, production
	 */
	environment: "dev" | "preview" | "production";

	/**
	 * Campaign environment: preview, production
	 */
	campaignEnvironment: "preview" | "production";
}

/**
 * Detect environment based on hostname and environment variables
 */
export function detectEnvironment(
	hostname: string,
	env?: Env,
): EnvironmentContext {
	// Normalize hostname for comparison
	const normalizedHostname = hostname.toLowerCase();

	// Detect campaign environment based on URL patterns
	const campaignEnvironment = detectCampaignEnvironment(normalizedHostname);

	// Detect engine environment
	// Priority: explicit env var > hostname patterns > fallback
	let environment: "dev" | "preview" | "production";

	if (env?.ENVIRONMENT) {
		// Use explicit environment variable if available
		const envVar = env.ENVIRONMENT.toLowerCase();
		if (envVar === "dev" || envVar === "development") {
			environment = "dev";
		} else if (envVar === "preview" || envVar === "staging") {
			environment = "preview";
		} else {
			environment = "production";
		}
	} else {
		// Fallback to hostname-based detection
		if (
			normalizedHostname.includes("dev.") ||
			normalizedHostname.includes("-dev.")
		) {
			environment = "dev";
		} else if (
			normalizedHostname.includes("preview") ||
			normalizedHostname.includes("staging")
		) {
			environment = "preview";
		} else {
			environment = "production";
		}
	}

	return {
		environment,
		campaignEnvironment,
	};
}

/**
 * Detect campaign environment based on URL patterns
 */
export function detectCampaignEnvironment(
	hostname: string,
): "preview" | "production" {
	const normalizedHostname = hostname.toLowerCase();

	// Check for preview URL patterns as specified:
	// - preview.frbzz.com/campaign
	// - preview-dev.frbzz.com
	// - preview-preview.frbzz.com
	const previewPatterns = [
		/^preview\.frbzz\.com$/,
		/^preview-dev\.frbzz\.com$/,
		/^preview-preview\.frbzz\.com$/,
		/^preview\.firebuzz\.dev$/,
		/^preview-dev\.firebuzz\.dev$/,
		/^preview-preview\.firebuzz\.dev$/,
	];

	for (const pattern of previewPatterns) {
		if (pattern.test(normalizedHostname)) {
			return "preview";
		}
	}

	// Check for local development patterns (localhost, 127.0.0.1, dev servers)
	const localDevelopmentPatterns = [
		/^localhost(:\d+)?$/,
		/^127\.0\.0\.1(:\d+)?$/,
		/^192\.168\.\d+\.\d+(:\d+)?$/, // Local network IPs
		/^10\.\d+\.\d+\.\d+(:\d+)?$/, // Private network IPs
		/^172\.\d+\.\d+\.\d+(:\d+)?$/, // Private network IPs
	];

	for (const pattern of localDevelopmentPatterns) {
		if (pattern.test(normalizedHostname)) {
			return "preview"; // Treat local development as preview
		}
	}

	// Default to production for all other hostnames
	return "production";
}

/**
 * Check if the current environment is a preview environment
 * Maintains compatibility with existing isPreview logic
 */
export function isPreviewEnvironment(hostname: string): boolean {
	return detectCampaignEnvironment(hostname) === "preview";
}
