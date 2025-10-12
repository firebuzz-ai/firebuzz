/**
 * Short Token Management for External Event Tracking
 *
 * Creates short click IDs that reference full session data in CACHE KV storage
 * with 10-day TTL and aggressive caching for immutable session data.
 */

export interface SessionTokenData {
	sessionId: string;
	userId: string;
	campaignId: string;
	workspaceId: string;
	projectId: string;
	landingPageId: string;
	abTestId?: string | null;
	abTestVariantId?: string | null;
	timestamp: number;
	environment: string;
	campaignEnvironment: string;
}

/**
 * Generate globally unique short click ID
 * Format: timestamp(base36) + random(4chars) = ~12 characters
 * Example: "m1k2n3p4q5r6"
 */
function generateGloballyUniqueClickId(): string {
	const timestamp = Date.now().toString(36); // ~7-8 chars
	const random = crypto.randomUUID().slice(0, 4); // 4 chars
	return `${timestamp}${random}`.toLowerCase();
}

/**
 * Create a short click ID and store session data in CACHE KV
 * TTL: 10 days (864000 seconds)
 */
export async function createShortClickId(
	sessionData: SessionTokenData,
	env: Env,
): Promise<string> {
	// Generate globally unique click ID
	const clickId = generateGloballyUniqueClickId();

	const kvData = {
		...sessionData,
		createdAt: Date.now(),
	};

	// Store in CACHE KV with session prefix and 10-day TTL
	// Note: Since session data is immutable, KV will naturally cache aggressively at edge
	await env.CACHE.put(`session:${clickId}`, JSON.stringify(kvData), {
		expirationTtl: 864000, // 10 days in seconds
		metadata: {
			type: "session_token",
			campaignId: sessionData.campaignId,
			createdAt: Date.now(),
		},
	});

	console.log("✅ Short click ID created:", {
		clickId,
		kvKey: `session:${clickId}`,
		sessionId: sessionData.sessionId,
		campaignId: sessionData.campaignId,
		expiresAt: new Date(Date.now() + 864000 * 1000).toISOString(),
	});

	return clickId;
}

/**
 * Resolve short click ID to full session data with aggressive caching
 * Since session data is immutable, we can cache it aggressively
 */
export async function resolveClickId(
	clickId: string,
	env: Env,
): Promise<SessionTokenData | null> {
	try {
		// Get from CACHE KV storage with maximum edge caching
		// cacheTtl = 10 days (864000 seconds) - matches expiration TTL for immutable data
		const kvData = await env.CACHE.get(`session:${clickId}`, {
			type: "json",
			cacheTtl: 864000, // 10 days edge cache - matches expiration for maximum performance
		});

		if (!kvData) {
			console.warn("❌ Click ID not found or expired:", {
				clickId,
				kvKey: `session:${clickId}`,
			});
			return null;
		}

		const sessionData = kvData as SessionTokenData & { createdAt: number };

		console.log("✅ Click ID resolved:", {
			clickId,
			kvKey: `session:${clickId}`,
			sessionId: sessionData.sessionId,
			campaignId: sessionData.campaignId,
			age: Math.round((Date.now() - sessionData.createdAt) / 1000 / 60), // minutes
		});

		// Return clean session data (remove createdAt)
		const { createdAt: _createdAt, ...cleanSessionData } = sessionData;
		return cleanSessionData;
	} catch (error) {
		console.error("❌ Error resolving click ID:", error);
		return null;
	}
}

/**
 * Create external link with short click ID parameter
 */
export function createExternalLinkWithClickId(
	baseUrl: string,
	clickId: string,
): string {
	const url = new URL(baseUrl);
	url.searchParams.set("frbzz_ci", clickId);
	return url.toString();
}

/**
 * Batch cleanup of expired tokens (for maintenance)
 */
export async function cleanupExpiredSessionTokens(
	env: Env,
	batchSize = 100,
): Promise<{ deleted: number; errors: number }> {
	let deleted = 0;
	let errors = 0;

	// KV automatically handles TTL expiration, but this can be used for manual cleanup
	try {
		const list = await env.CACHE.list({ prefix: "session:", limit: batchSize });

		for (const key of list.keys) {
			try {
				const data = await env.CACHE.get(key.name, "json");
				if (!data) {
					// Already expired or deleted
					deleted++;
					continue;
				}

				const tokenData = data as { createdAt: number };
				const age = Date.now() - tokenData.createdAt;

				// If older than 10 days, delete manually
				if (age > 864000 * 1000) {
					await env.CACHE.delete(key.name);
					deleted++;
				}
			} catch (error) {
				console.error("Error processing session token:", key.name, error);
				errors++;
			}
		}
	} catch (error) {
		console.error("Error during session token cleanup:", error);
		errors++;
	}

	return { deleted, errors };
}
