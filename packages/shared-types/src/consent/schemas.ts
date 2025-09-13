import { z } from "zod";

// Consent purposes schema
export const ConsentPurposesSchema = z.object({
	essential: z.boolean(),
	analytics: z.boolean(),
	marketing: z.boolean(),
	functional: z.boolean(),
});

export type ConsentPurposes = z.infer<typeof ConsentPurposesSchema>;

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

// Get consent request
export const GetConsentRequestSchema = z.object({
	subject_id: z.string().min(1),
	campaign_id: z.string().min(1),
	domain: z.string().min(1).optional(),
});

export type GetConsentRequest = z.infer<typeof GetConsentRequestSchema>;

// Get consent response schema
export const GetConsentResponseSchema = z.object({
	success: z.boolean(),
	consent: z
		.object({
			id: z.string(),
			workspace_id: z.string(),
			project_id: z.string(),
			campaign_id: z.string(),
			subject_id: z.string(),
			domain: z.string(),
			purposes: ConsentPurposesSchema,
			status: z.string(),
			given_at: z.number(),
			expires_at: z.number().nullable(),
		})
		.optional(),
	error: z.string().optional(),
});

export type GetConsentResponse = z.infer<typeof GetConsentResponseSchema>;
