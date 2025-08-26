/**
 * Generate a globally unique ID for sessions, attribution, and events
 * Uses UUIDv7 which has better database performance due to time-ordering
 * This ensures true uniqueness and excellent sortability/indexing performance
 */
export function generateUniqueId(): string {
	// Generate UUIDv7 - time-ordered UUID with better DB performance
	return generateUUIDv7();
}

/**
 * Generate a UUIDv7 - time-ordered UUID with millisecond precision
 * Uses crypto.randomUUID() for random parts and replaces timestamp portion
 * Format: tttttttt-tttt-7xxx-yxxx-xxxxxxxxxxxx
 * Where t = timestamp, 7 = version, x = random, y = variant bits
 */
function generateUUIDv7(timestamp: Date = new Date()): string {
	const serializedTimestamp = timestamp
		.valueOf()
		.toString(16)
		.padStart(12, "0");
	const baseUUID = crypto.randomUUID();
	return `${serializedTimestamp.slice(0, 8)}-${serializedTimestamp.slice(8, 12)}-7${baseUUID.slice(15)}`;
}
