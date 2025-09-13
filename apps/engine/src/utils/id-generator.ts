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
 * Generate a deterministic user ID based on daily salt, campaign ID, IP address, and user agent
 * This creates a consistent user identifier for the same inputs within a day
 * Format: hash(daily_salt + campaign_id + ip_address + user_agent)
 */
export async function generateUserId(
	campaignId: string,
	ipAddress: string,
	userAgent: string,
): Promise<string> {
	const today = new Date().toISOString().split("T")[0];
	const dailySalt = `salt-${today}`;
	const combinedString = `${dailySalt}${campaignId}${ipAddress}${userAgent}`;

	const encoder = new TextEncoder();
	const data = encoder.encode(combinedString);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = new Uint8Array(hashBuffer);
	const hashHex = Array.from(hashArray)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	return hashHex;
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
