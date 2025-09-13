import type {
	ConsentPurposes,
	ConsentRecord,
	ConsentRecordWithPurposes,
} from "@firebuzz/shared-types";
import {
	ConsentStatus,
	parseConsentPurposes,
	stringifyConsentPurposes,
} from "@firebuzz/shared-types";
import { generateUniqueId } from "../../utils/id-generator";

/**
 * Record or update consent for a subject
 */
export async function recordConsent(
	db: D1Database,
	params: {
		workspace_id: string;
		project_id: string;
		campaign_id: string;
		subject_id: string;
		domain: string;
		purposes: ConsentPurposes;
		expires_in_days?: number;
		ip?: string;
		user_agent?: string;
	},
): Promise<{ consent_id: string; expires_at: number | null }> {
	const now = Math.floor(Date.now() / 1000);
	const expires_at = params.expires_in_days
		? now + params.expires_in_days * 24 * 60 * 60
		: null;

	// First, mark any existing active consent as withdrawn for this subject/campaign/domain
	await db
		.prepare(
			`
		UPDATE consents
		SET status = ?, updated_at = ?
		WHERE subject_id = ? AND campaign_id = ? AND domain = ? AND status = ?
	`,
		)
		.bind(
			ConsentStatus.WITHDRAWN,
			now,
			params.subject_id,
			params.campaign_id,
			params.domain,
			ConsentStatus.ACTIVE,
		)
		.run();

	// Create new consent record
	const consent_id = `consent_${generateUniqueId()}`;

	await db
		.prepare(
			`
		INSERT INTO consents (
			id, workspace_id, project_id, campaign_id, subject_id, domain,
			purposes, status, given_at, expires_at, ip, user_agent,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		)
		.bind(
			consent_id,
			params.workspace_id,
			params.project_id,
			params.campaign_id,
			params.subject_id,
			params.domain,
			stringifyConsentPurposes(params.purposes),
			ConsentStatus.ACTIVE,
			now,
			expires_at,
			params.ip || null,
			params.user_agent || null,
			now,
			now,
		)
		.run();

	return { consent_id, expires_at };
}

/**
 * Get active consent for a subject
 */
export async function getActiveConsent(
	db: D1Database,
	subject_id: string,
	campaign_id: string,
	domain?: string,
): Promise<ConsentRecordWithPurposes | null> {
	const query = domain
		? "SELECT * FROM consents WHERE subject_id = ? AND campaign_id = ? AND domain = ? AND status = ? ORDER BY created_at DESC LIMIT 1"
		: "SELECT * FROM consents WHERE subject_id = ? AND campaign_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1";

	const params = domain
		? [subject_id, campaign_id, domain, ConsentStatus.ACTIVE]
		: [subject_id, campaign_id, ConsentStatus.ACTIVE];

	const result = await db
		.prepare(query)
		.bind(...params)
		.first<ConsentRecord>();

	if (!result) {
		return null;
	}

	// Check if consent has expired
	const now = Math.floor(Date.now() / 1000);
	if (result.expires_at && result.expires_at <= now) {
		// Mark as expired
		await expireConsent(db, result.id);
		return null;
	}

	return {
		...result,
		purposes: parseConsentPurposes(result.purposes),
	};
}

/**
 * Withdraw consent for a subject
 */
export async function withdrawConsent(
	db: D1Database,
	subject_id: string,
	campaign_id: string,
	domain?: string,
): Promise<boolean> {
	const now = Math.floor(Date.now() / 1000);

	const query = domain
		? "UPDATE consents SET status = ?, updated_at = ? WHERE subject_id = ? AND campaign_id = ? AND domain = ? AND status = ?"
		: "UPDATE consents SET status = ?, updated_at = ? WHERE subject_id = ? AND campaign_id = ? AND status = ?";

	const params = domain
		? [
				ConsentStatus.WITHDRAWN,
				now,
				subject_id,
				campaign_id,
				domain,
				ConsentStatus.ACTIVE,
			]
		: [
				ConsentStatus.WITHDRAWN,
				now,
				subject_id,
				campaign_id,
				ConsentStatus.ACTIVE,
			];

	const result = await db
		.prepare(query)
		.bind(...params)
		.run();

	return result.success && result.meta.changes > 0;
}

/**
 * Mark expired consents (internal helper)
 */
async function expireConsent(
	db: D1Database,
	consent_id: string,
): Promise<void> {
	const now = Math.floor(Date.now() / 1000);

	await db
		.prepare(
			`
		UPDATE consents
		SET status = ?, updated_at = ?
		WHERE id = ?
	`,
		)
		.bind(ConsentStatus.EXPIRED, now, consent_id)
		.run();
}

/**
 * Get all consents for a subject (for audit/history purposes)
 */
export async function getConsentHistory(
	db: D1Database,
	subject_id: string,
	campaign_id?: string,
	limit = 50,
): Promise<ConsentRecordWithPurposes[]> {
	const query = campaign_id
		? "SELECT * FROM consents WHERE subject_id = ? AND campaign_id = ? ORDER BY created_at DESC LIMIT ?"
		: "SELECT * FROM consents WHERE subject_id = ? ORDER BY created_at DESC LIMIT ?";

	const params = campaign_id
		? [subject_id, campaign_id, limit]
		: [subject_id, limit];

	const results = await db
		.prepare(query)
		.bind(...params)
		.all<ConsentRecord>();

	return results.results.map((record) => ({
		...record,
		purposes: parseConsentPurposes(record.purposes),
	}));
}

/**
 * Clean up expired consents (batch job helper)
 */
export async function cleanupExpiredConsents(db: D1Database): Promise<number> {
	const now = Math.floor(Date.now() / 1000);

	const result = await db
		.prepare(
			`
		UPDATE consents
		SET status = ?, updated_at = ?
		WHERE status = ? AND expires_at IS NOT NULL AND expires_at <= ?
	`,
		)
		.bind(ConsentStatus.EXPIRED, now, ConsentStatus.ACTIVE, now)
		.run();

	return result.success ? result.meta.changes : 0;
}

/**
 * Check if subject has given consent for specific purposes
 */
export async function hasConsentForPurpose(
	db: D1Database,
	subject_id: string,
	campaign_id: string,
	purpose: keyof ConsentPurposes,
	domain?: string,
): Promise<boolean> {
	const consent = await getActiveConsent(db, subject_id, campaign_id, domain);
	return consent?.purposes[purpose] ?? false;
}
