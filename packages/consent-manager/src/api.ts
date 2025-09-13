import type { ConsentPreferences, SessionContext } from "./types";
import type {
	ConsentPurposes,
	RecordConsentRequest,
	RecordConsentResponse,
} from "./types/consent";

export interface ApiConfig {
	workerEndpoint: string;
	workspaceId: string;
	projectId: string;
	campaignId: string;
	debug?: boolean;
}

export class ConsentApiClient {
	private config: ApiConfig;

	constructor(config: ApiConfig) {
		this.config = config;
	}

	private log(message: string, ...args: unknown[]): void {
		if (this.config.debug) {
			console.log(`[Consent API] ${message}`, ...args);
		}
	}

	private async makeRequest<T>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<T> {
		const url = `${this.config.workerEndpoint}${endpoint}`;

		const defaultHeaders = {
			"Content-Type": "application/json",
		};

		const config = {
			...options,
			headers: {
				...defaultHeaders,
				...options.headers,
			},
		};

		this.log(`Making request to ${url}`, config);

		try {
			const response = await fetch(url, config);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = (await response.json()) as T;
			this.log("Response received:", data);

			return data;
		} catch (error) {
			this.log("Request failed:", error);
			throw error;
		}
	}

	async recordConsent(
		preferences: ConsentPreferences,
		sessionContext: SessionContext,
	): Promise<void> {
		// Convert ConsentPreferences to ConsentPurposes format
		const purposes: ConsentPurposes = {
			essential: preferences.necessary,
			analytics: preferences.analytics,
			marketing: preferences.marketing,
			functional: preferences.functional,
		};

		const consentRequest: RecordConsentRequest = {
			workspace_id: this.config.workspaceId,
			project_id: this.config.projectId,
			campaign_id: this.config.campaignId,
			subject_id: sessionContext.userId,
			domain: typeof window !== "undefined" ? window.location.hostname : "",
			purposes,
			expires_in_days: 365, // Default 1 year
		};

		const response = await this.makeRequest<RecordConsentResponse>(
			"/client-api/v1/consent/record",
			{
				method: "POST",
				body: JSON.stringify(consentRequest),
			},
		);

		if (!response.success) {
			throw new Error(response.error || "Failed to record consent");
		}

		this.log("Consent recorded successfully", response);
	}

	async updateConsent(
		preferences: ConsentPreferences,
		sessionContext: SessionContext,
	): Promise<void> {
		// For updates, we just record a new consent entry
		// The backend will handle versioning and history
		await this.recordConsent(preferences, sessionContext);
		this.log("Consent updated successfully");
	}

	async revokeAllConsent(sessionContext: SessionContext): Promise<void> {
		// Revoke all non-essential consent
		const revokedPreferences: ConsentPreferences = {
			necessary: true, // Can't revoke necessary cookies
			analytics: false,
			marketing: false,
			functional: false,
		};

		await this.recordConsent(revokedPreferences, sessionContext);
		this.log("All consent revoked successfully");
	}
}

// Singleton instance for convenience
let apiClientInstance: ConsentApiClient | null = null;

export const configureApiClient = (config: ApiConfig): ConsentApiClient => {
	apiClientInstance = new ConsentApiClient(config);
	return apiClientInstance;
};

export const getApiClient = (): ConsentApiClient | null => {
	return apiClientInstance;
};

// Utility functions for external usage
export const recordConsent = async (
	preferences: ConsentPreferences,
	sessionContext: SessionContext,
): Promise<void> => {
	const client = getApiClient();
	if (!client) {
		// Silently skip if API client is not configured (no session context)
		// This is expected in development/template environments
		console.warn(
			"[Consent Manager] API client not configured - skipping consent recording. This is normal in development environments.",
		);
		return;
	}

	await client.recordConsent(preferences, sessionContext);
};

export const updateConsent = async (
	preferences: ConsentPreferences,
	sessionContext: SessionContext,
): Promise<void> => {
	const client = getApiClient();
	if (!client) {
		// Silently skip if API client is not configured (no session context)
		console.warn(
			"[Consent Manager] API client not configured - skipping consent update. This is normal in development environments.",
		);
		return;
	}

	await client.updateConsent(preferences, sessionContext);
};

export const revokeAllConsent = async (
	sessionContext: SessionContext,
): Promise<void> => {
	const client = getApiClient();
	if (!client) {
		// Silently skip if API client is not configured (no session context)
		console.warn(
			"[Consent Manager] API client not configured - skipping consent revocation. This is normal in development environments.",
		);
		return;
	}

	await client.revokeAllConsent(sessionContext);
};
