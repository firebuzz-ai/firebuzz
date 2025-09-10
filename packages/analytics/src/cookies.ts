// ============================================================================
// Utility Functions (Only Keep What's Needed)
// ============================================================================

/**
 * Generate temporary ID for anonymous tracking
 */
export function generateTempId(prefix: string): string {
	return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Test Mode Support (Simplified)
// ============================================================================

let testMode = false;
let mockSessionData: any = null;

export function enableTestMode(mockData?: {
	userId?: string;
	sessionId?: string;
	campaignId?: string;
}) {
	testMode = true;
	mockSessionData = mockData;
	
	if (mockData) {
		console.log("[Analytics] Test mode enabled with mock data:", mockData);
	}
}

export function disableTestMode() {
	testMode = false;
	mockSessionData = null;
}

export function isTestMode(): boolean {
	return testMode;
}

export function getTestModeData() {
	return mockSessionData;
}

// ============================================================================
// Environment Detection (Keep for Backwards Compatibility)
// ============================================================================

/**
 * Detect if we're in a preview environment based on hostname
 * @deprecated Use session context environment instead
 */
export function isPreviewEnvironment(): boolean {
	if (typeof window === "undefined") return false;

	const hostname = window.location.hostname;
	return (
		hostname.includes("preview.frbzz.com") ||
		(hostname.startsWith("preview-") && hostname.includes(".frbzz.com"))
	);
}