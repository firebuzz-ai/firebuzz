// Copied from @firebuzz/shared-types to make package self-contained for npm publishing
import { z } from "zod";

// Consent status enum
export const ConsentStatus = {
	ACTIVE: "active",
	WITHDRAWN: "withdrawn",
	EXPIRED: "expired",
} as const;

export type ConsentStatusType =
	(typeof ConsentStatus)[keyof typeof ConsentStatus];

// Consent purposes schema
export const ConsentPurposesSchema = z.object({
	essential: z.boolean(),
	analytics: z.boolean(),
	marketing: z.boolean(),
	functional: z.boolean(),
});

export type ConsentPurposes = z.infer<typeof ConsentPurposesSchema>;

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

// API request schemas
export const RecordConsentRequestSchema = z.object({
	workspace_id: z.string().min(1),
	project_id: z.string().min(1),
	campaign_id: z.string().min(1),
	subject_id: z.string().min(1),
	domain: z.string().min(1),
	purposes: ConsentPurposesSchema,
	expires_in_days: z.number().int().positive().optional().default(365),
});

export type RecordConsentRequest = z.infer<typeof RecordConsentRequestSchema>;

export const RecordConsentResponseSchema = z.object({
	success: z.boolean(),
	consent_id: z.string().optional(),
	expires_at: z.string().optional(), // ISO string
	error: z.string().optional(),
});

export type RecordConsentResponse = z.infer<typeof RecordConsentResponseSchema>;

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
