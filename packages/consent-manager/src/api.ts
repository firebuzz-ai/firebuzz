import type { ConsentRecord, SessionContext, ConsentPreferences } from "./types";

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
		options: RequestInit = {}
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

			const data = await response.json() as T;
			this.log("Response received:", data);
			
			return data;
		} catch (error) {
			this.log("Request failed:", error);
			throw error;
		}
	}

	async recordConsent(
		preferences: ConsentPreferences,
		sessionContext: SessionContext
	): Promise<void> {
		const consentRecord: ConsentRecord = {
			userId: sessionContext.userId,
			sessionId: sessionContext.session.sessionId,
			workspaceId: this.config.workspaceId,
			projectId: this.config.projectId,
			campaignId: this.config.campaignId,
			preferences,
			timestamp: Date.now(),
			version: 1, // Consent version
			userAgent: navigator.userAgent,
			countryCode: sessionContext.gdprSettings.countryCode,
			language: sessionContext.gdprSettings.language,
			isEU: sessionContext.gdprSettings.isEU,
			isCalifornian: sessionContext.gdprSettings.isCalifornian,
		};

		await this.makeRequest("/api/consent/record", {
			method: "POST",
			body: JSON.stringify(consentRecord),
		});

		this.log("Consent recorded successfully");
	}

	async getConsentHistory(userId: string): Promise<ConsentRecord[]> {
		const response = await this.makeRequest<{ records: ConsentRecord[] }>(
			`/api/consent/history/${userId}`,
			{
				method: "GET",
			}
		);

		return response.records;
	}

	async updateConsent(
		preferences: ConsentPreferences,
		sessionContext: SessionContext
	): Promise<void> {
		// For updates, we just record a new consent entry
		// The backend will handle versioning and history
		await this.recordConsent(preferences, sessionContext);
		this.log("Consent updated successfully");
	}

	async revokeConsent(userId: string, sessionContext: SessionContext): Promise<void> {
		const revokedPreferences: ConsentPreferences = {
			necessary: true, // Can't revoke necessary cookies
			analytics: false,
			marketing: false,
			functional: false,
		};

		await this.recordConsent(revokedPreferences, sessionContext);
		this.log("Consent revoked successfully");
	}

	// Health check method
	async ping(): Promise<boolean> {
		try {
			await this.makeRequest("/api/health", {
				method: "GET",
			});
			return true;
		} catch {
			return false;
		}
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
	sessionContext: SessionContext
): Promise<void> => {
	const client = getApiClient();
	if (!client) {
		throw new Error("API client not configured. Call configureApiClient first.");
	}
	
	await client.recordConsent(preferences, sessionContext);
};

export const updateConsent = async (
	preferences: ConsentPreferences,
	sessionContext: SessionContext
): Promise<void> => {
	const client = getApiClient();
	if (!client) {
		throw new Error("API client not configured. Call configureApiClient first.");
	}
	
	await client.updateConsent(preferences, sessionContext);
};

export const revokeConsent = async (
	userId: string,
	sessionContext: SessionContext
): Promise<void> => {
	const client = getApiClient();
	if (!client) {
		throw new Error("API client not configured. Call configureApiClient first.");
	}
	
	await client.revokeConsent(userId, sessionContext);
};