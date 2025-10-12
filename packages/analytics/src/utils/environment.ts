/**
 * Detect if running in WebContainer environment
 */
export function isWebContainer(): boolean {
	// Check if we're in a browser environment first
	if (typeof window === "undefined") {
		return false;
	}

	try {
		// Check for WebContainer-specific domains
		const hostname = window.location.hostname;
		if (
			hostname.includes("webcontainer") ||
			hostname.includes("webcontainer-api") ||
			hostname.includes("local-corp.webcontainer-api.io") ||
			hostname.includes("stackblitz")
		) {
			return true;
		}

		// Check for WebContainer-specific global objects or properties
		// @ts-expect-error
		if (window.__WC_VERSION__ || window.__WEBCONTAINER__) {
			return true;
		}

		// Check if running on specific ports commonly used by WebContainers
		const port = window.location.port;
		if (
			hostname === "localhost" &&
			["3000", "3001", "4000", "5173", "5174"].includes(port)
		) {
			// Additional check for WebContainer-like environment
			// This is a heuristic - we check if certain APIs are restricted
			try {
				// WebContainers often restrict or modify certain browser APIs
				const testStorage = "__webcontainer_test__";
				window.localStorage.setItem(testStorage, testStorage);
				window.localStorage.removeItem(testStorage);
			} catch {
				// If localStorage fails, might be in a restricted environment
				return true;
			}
		}

		return false;
	} catch (_error) {
		// If any checks fail, assume we're not in WebContainer
		return false;
	}
}

/**
 * Check if analytics should be disabled based on environment
 */
export function shouldDisableAnalytics(): boolean {
	// Disable in WebContainer environments
	if (isWebContainer()) {
		console.log("[Analytics] Disabled in WebContainer environment");
		return true;
	}

	// Check for other conditions where analytics should be disabled
	if (typeof window !== "undefined") {
		// Disable if explicitly set in window object
		// @ts-expect-error
		if (window.__DISABLE_ANALYTICS__) {
			return true;
		}

		// Disable in development environments (but not preview/staging)
		const hostname = window.location.hostname;
		if (
			hostname === "localhost" &&
			!window.location.search.includes("analytics=true")
		) {
			// Allow override with query parameter for testing
			return false; // Keep analytics enabled for localhost by default, let enabled prop control it
		}
	}

	return false;
}
