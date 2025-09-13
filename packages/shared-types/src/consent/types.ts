import type { ConsentPurposes } from "./schemas";

// Consent status enum
export const ConsentStatus = {
	ACTIVE: "active",
	WITHDRAWN: "withdrawn",
	EXPIRED: "expired",
} as const;

export type ConsentStatusType =
	(typeof ConsentStatus)[keyof typeof ConsentStatus];

// Database consent record
export interface ConsentRecord {
	id: string;
	workspace_id: string;
	project_id: string;
	campaign_id: string;
	subject_id: string;
	domain: string;
	purposes: string; // JSON string of ConsentPurposes
	status: ConsentStatusType;
	given_at: number; // Unix timestamp
	expires_at: number | null; // Unix timestamp
	ip: string | null;
	user_agent: string | null;
	created_at: number;
	updated_at: number;
}

// Consent with parsed purposes
export interface ConsentRecordWithPurposes
	extends Omit<ConsentRecord, "purposes"> {
	purposes: ConsentPurposes;
}

// Utility functions
export const parseConsentPurposes = (purposesJson: string): ConsentPurposes => {
	try {
		return JSON.parse(purposesJson);
	} catch {
		// Default to all false if parsing fails
		return {
			essential: false,
			analytics: false,
			marketing: false,
			functional: false,
		};
	}
};

export const stringifyConsentPurposes = (purposes: ConsentPurposes): string => {
	return JSON.stringify(purposes);
};
