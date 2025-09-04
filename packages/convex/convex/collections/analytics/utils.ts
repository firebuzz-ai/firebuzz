// Normalize periods for caching - rounds to 3-minute intervals
export function normalizePeriodForCaching(periodStart: string, periodEnd: string): {
	normalizedPeriodStart: string;
	normalizedPeriodEnd: string;
} {
	const CACHE_INTERVAL_MINUTES = 3;
	const CACHE_INTERVAL_MS = CACHE_INTERVAL_MINUTES * 60 * 1000;

	// Parse the dates
	const startDate = new Date(periodStart);
	const endDate = new Date(periodEnd);

	// Round start date down to nearest cache interval
	const normalizedStartMs = Math.floor(startDate.getTime() / CACHE_INTERVAL_MS) * CACHE_INTERVAL_MS;
	
	// Round end date up to nearest cache interval
	const normalizedEndMs = Math.ceil(endDate.getTime() / CACHE_INTERVAL_MS) * CACHE_INTERVAL_MS;

	return {
		normalizedPeriodStart: new Date(normalizedStartMs).toISOString(),
		normalizedPeriodEnd: new Date(normalizedEndMs).toISOString(),
	};
}

// Generate hash key using normalized periods for caching while preserving actual periods for queries
export function generateHashKey(paramsString: string): string {
	// Simple hash function (you could use a more robust one like SHA-256)
	let hash = 0;
	for (let i = 0; i < paramsString.length; i++) {
		const char = paramsString.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}

	return `analytics-${Math.abs(hash).toString(16)}`;
}
