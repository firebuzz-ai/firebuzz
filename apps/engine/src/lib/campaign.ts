import type {
	CleanedABTest as ABTest,
	CampaignConfig,
	CleanedSegment as Segment,
	CleanedSegmentRule as SegmentRule,
} from "@firebuzz/shared-types/campaign";
import type { Context } from "hono";
import { type RequestData, parseRequest } from "./request";
import {
	type AttributionData,
	type SessionData,
	checkExistingSession,
	createAttribution,
	generateUniqueId,
} from "./session";

// ============================================================================
// Campaign Evaluation Types
// ============================================================================

export interface CampaignEvaluationResult {
	type: "default" | "segment" | "abtest";
	segmentId?: string;
	landingPageId?: string;
	abTest?: ABTest;
	matchedSegment?: Segment;
}

// ============================================================================
// Main Campaign Evaluation Function
// ============================================================================

/**
 * Evaluate a campaign configuration against request data to determine which segment to use
 *
 * Session behavior:
 * - AB Test users: Maintain same variant while test is running (for consistency)
 * - Regular users: Re-evaluate on each visit (context may change - device, location, UTM, etc.)
 *
 * @param c Hono context containing the request
 * @param campaignConfig The campaign configuration to evaluate
 * @param sessionData The session data created at worker level
 * @param isExistingSession Whether this is an existing session (not a new session)
 * @returns The evaluation result with the selected segment or default
 */
export function evaluateCampaign(
	c: Context,
	campaignConfig: CampaignConfig,
	sessionData: SessionData,
	isExistingSession: boolean,
): CampaignEvaluationResult {
	// IMPORTANT: We only maintain session consistency for AB tests
	// Regular landing pages are re-evaluated on each visit

	// If existing session with AB test variant, check if test is still running
	if (isExistingSession && sessionData.abTest) {
		// Find the segment and AB test that matches the session
		for (const segment of campaignConfig.segments) {
			const abTest = segment.abTests?.find(
				(test) => test.id === sessionData.abTest?.testId,
			);
			// Only return AB test if it's still running
			if (abTest && abTest.status === "running") {
				return {
					type: "abtest",
					segmentId: segment.id,
					abTest,
					matchedSegment: segment,
				};
			}
			// If test is no longer running, fall through to regular evaluation
			// This ensures users get re-evaluated if the test has ended
		}
	}

	// For returning users without AB test, we should re-evaluate them
	// Their context might have changed (device, UTM params, location, etc.)
	// Also, landing pages might have been deleted or changed
	// So we let them fall through to regular evaluation below

	// Parse request data for new session evaluation
	const requestData = parseRequest(c);

	// Sort segments by priority (lower number = higher priority)
	const sortedSegments = [...campaignConfig.segments].sort(
		(a, b) => a.priority - b.priority,
	);

	// Evaluate each segment in priority order
	for (const segment of sortedSegments) {
		if (evaluateSegment(requestData, segment)) {
			// Check if segment has active AB test
			const activeABTest = segment.abTests?.find(
				(test) => test.status === "running",
			);

			if (activeABTest) {
				// Check pooling percentage - only route portion of traffic to AB test
				// Use session ID as stable identifier for consistent assignment
				const shouldEnterABTest = shouldEnterPool(
					sessionData.sessionId,
					activeABTest.id,
					activeABTest.poolingPercent,
				);

				if (shouldEnterABTest) {
					return {
						type: "abtest",
						segmentId: segment.id,
						abTest: activeABTest,
						matchedSegment: segment,
					};
				}
				// Fall through to return primary landing page if not entering AB test
			}

			// Return the segment with its primary landing page
			return {
				type: "segment",
				segmentId: segment.id,
				landingPageId: segment.primaryLandingPageId,
				matchedSegment: segment,
			};
		}
	}

	// No segment matched, return default
	return {
		type: "default",
		landingPageId: campaignConfig.defaultLandingPageId,
	};
}

// ============================================================================
// Segment Evaluation
// ============================================================================

/**
 * Evaluate if a segment matches the request data
 * @param requestData The parsed request data
 * @param segment The segment to evaluate
 * @returns True if all rules match, false otherwise
 */
function evaluateSegment(requestData: RequestData, segment: Segment): boolean {
	// If no rules, segment always matches
	if (!segment.rules || segment.rules.length === 0) {
		return true;
	}

	// All rules must match (AND logic)
	return segment.rules.every((rule) => evaluateRule(requestData, rule));
}

// ============================================================================
// AB Test Pooling Logic
// ============================================================================

/**
 * Determines if a visitor should enter an AB test based on pooling percentage
 * Uses a deterministic hash to ensure consistent assignment
 * @param visitorIdentifier Unique identifier for the visitor (e.g., IP address)
 * @param testId The AB test ID
 * @param poolingPercent Percentage of traffic that should enter the test (0-100)
 * @returns True if visitor should enter the AB test
 */
function shouldEnterPool(
	visitorIdentifier: string,
	testId: string,
	poolingPercent: number,
): boolean {
	// Create a unique string for this visitor+test combination
	const combinedKey = `${visitorIdentifier}-${testId}`;

	// Generate a simple hash from the combined key
	let hash = 0;
	for (let i = 0; i < combinedKey.length; i++) {
		const char = combinedKey.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}

	// Convert hash to a number between 0-100
	const normalizedValue = Math.abs(hash) % 100;

	// Return true if the visitor falls within the pooling percentage
	return normalizedValue < poolingPercent;
}

// ============================================================================
// Rule Evaluation
// ============================================================================

/**
 * Evaluate a single rule against request data
 * @param requestData The parsed request data
 * @param rule The rule to evaluate
 * @returns True if the rule matches, false otherwise
 */
function evaluateRule(requestData: RequestData, rule: SegmentRule): boolean {
	try {
		switch (rule.ruleType) {
			case "visitorType":
				// For now, always match "all" visitor type
				// TODO: Implement visitor tracking with cookies/storage
				return rule.value === "all";

			case "country":
				return evaluateStringRule(
					requestData.geo.country,
					rule.operator,
					rule.value,
				);

			case "isEUCountry":
				return evaluateBooleanRule(
					requestData.geo.isEUCountry,
					rule.operator,
					rule.value,
				);

			case "language":
				return evaluateStringRule(
					requestData.localization.language,
					rule.operator,
					rule.value,
				);

			case "deviceType":
				return evaluateStringRule(
					requestData.device.type,
					rule.operator,
					rule.value,
				);

			case "browser":
				return evaluateStringRule(
					requestData.device.browser.toLowerCase(),
					rule.operator,
					rule.value,
				);

			case "operatingSystem":
				return evaluateStringRule(
					requestData.device.os.toLowerCase(),
					rule.operator,
					rule.value,
				);

			case "utmSource":
				return evaluateStringRule(
					requestData.params.utm.utm_source,
					rule.operator,
					rule.value,
				);

			case "utmMedium":
				return evaluateStringRule(
					requestData.params.utm.utm_medium,
					rule.operator,
					rule.value,
				);

			case "utmCampaign":
				return evaluateStringRule(
					requestData.params.utm.utm_campaign,
					rule.operator,
					rule.value,
				);

			case "utmTerm":
				return evaluateStringRule(
					requestData.params.utm.utm_term,
					rule.operator,
					rule.value,
				);

			case "utmContent":
				return evaluateStringRule(
					requestData.params.utm.utm_content,
					rule.operator,
					rule.value,
				);

			case "referrer":
				return evaluateStringRule(
					requestData.traffic.referrer,
					rule.operator,
					rule.value,
				);

			case "customParameter":
				// For custom parameters, we need to check if the parameter exists
				// The value in the rule should be in format "paramName:paramValue"
				if (typeof rule.value === "string" && rule.value.includes(":")) {
					const [paramName, paramValue] = rule.value.split(":", 2);
					return evaluateStringRule(
						requestData.params.custom[paramName],
						rule.operator,
						paramValue,
					);
				}
				return false;

			case "timeZone":
				return evaluateStringRule(
					requestData.geo.timezone,
					rule.operator,
					rule.value,
				);

			case "hourOfDay": {
				// Get current hour in user's timezone
				const hour = new Date().getHours(); // TODO: Use user's timezone
				return evaluateNumberRule(hour, rule.operator, rule.value);
			}

			case "dayOfWeek": {
				// Get current day of week
				const days = [
					"sunday",
					"monday",
					"tuesday",
					"wednesday",
					"thursday",
					"friday",
					"saturday",
				];
				const currentDay = days[new Date().getDay()];
				return evaluateStringRule(currentDay, rule.operator, rule.value);
			}

			default:
				// Unknown rule type, don't match
				return false;
		}
	} catch {
		// If evaluation fails, don't match
		return false;
	}
}

// ============================================================================
// Rule Type Evaluators
// ============================================================================

/**
 * Evaluate string-based rules
 */
function evaluateStringRule(
	actual: string | null | undefined,
	operator: string,
	expected: string | number | boolean | string[] | number[],
): boolean {
	const actualValue = actual?.toLowerCase() || "";

	switch (operator) {
		case "equals":
			return actualValue === String(expected).toLowerCase();

		case "not_equals":
			return actualValue !== String(expected).toLowerCase();

		case "contains":
			return actualValue.includes(String(expected).toLowerCase());

		case "not_contains":
			return !actualValue.includes(String(expected).toLowerCase());

		case "starts_with":
			return actualValue.startsWith(String(expected).toLowerCase());

		case "ends_with":
			return actualValue.endsWith(String(expected).toLowerCase());

		case "in":
			if (Array.isArray(expected)) {
				return expected.some(
					(val) => actualValue === String(val).toLowerCase(),
				);
			}
			return false;

		case "not_in":
			if (Array.isArray(expected)) {
				return !expected.some(
					(val) => actualValue === String(val).toLowerCase(),
				);
			}
			return true;

		default:
			return false;
	}
}

/**
 * Evaluate number-based rules
 */
function evaluateNumberRule(
	actual: number,
	operator: string,
	expected: string | number | boolean | string[] | number[],
): boolean {
	switch (operator) {
		case "equals":
			return actual === Number(expected);

		case "not_equals":
			return actual !== Number(expected);

		case "greater_than":
			return actual > Number(expected);

		case "less_than":
			return actual < Number(expected);

		case "between":
			if (Array.isArray(expected) && expected.length >= 2) {
				const min = Number(expected[0]);
				const max = Number(expected[1]);
				return actual >= min && actual <= max;
			}
			return false;

		case "in":
			if (Array.isArray(expected)) {
				return expected.some((val) => actual === Number(val));
			}
			return false;

		case "not_in":
			if (Array.isArray(expected)) {
				return !expected.some((val) => actual === Number(val));
			}
			return true;

		default:
			return false;
	}
}

/**
 * Evaluate boolean-based rules
 */
function evaluateBooleanRule(
	actual: boolean,
	operator: string,
	expected: string | number | boolean | string[] | number[],
): boolean {
	switch (operator) {
		case "equals":
			return actual === (expected === true || expected === "true");

		case "not_equals":
			return actual !== (expected === true || expected === "true");

		default:
			return false;
	}
}

// ============================================================================
// Complete Campaign Evaluation with Session Management
// ============================================================================

export interface CampaignEvaluationWithSession {
	evaluation: CampaignEvaluationResult;
	session: SessionData;
	attribution: AttributionData;
	isReturning: boolean;
}

/**
 * Evaluate campaign and handle session management in one call
 * This is the main function to use for complete campaign handling
 * Now handles session creation first, then campaign evaluation
 */
export async function evaluateCampaignWithSession(
	c: Context,
	campaignConfig: CampaignConfig,
): Promise<CampaignEvaluationWithSession> {
	// First check for existing session or create new one
	const sessionCheck = checkExistingSession(
		c,
		campaignConfig.campaignId,
		campaignConfig,
	);

	// Get UTM parameters for attribution
	const url = new URL(c.req.url);
	const utmSource = url.searchParams.get("utm_source") || undefined;
	const utmMedium = url.searchParams.get("utm_medium") || undefined;

	// Handle attribution (create or reuse)
	const attribution =
		sessionCheck.attributionData ||
		createAttribution(
			c,
			campaignConfig.campaignId,
			campaignConfig,
			utmSource,
			utmMedium,
		);

	// Create session data for evaluation (either existing or new)
	let session: SessionData;
	let isReturning: boolean;

	if (sessionCheck.isReturning && sessionCheck.sessionData) {
		// Use existing session
		session = sessionCheck.sessionData;
		isReturning = true;
	} else {
		// Create temporary session for evaluation (we'll update it with AB test data later)
		session = {
			sessionId: generateUniqueId(),
			campaignId: campaignConfig.campaignId,
			createdAt: Date.now(),
			sessionEndsAt: Date.now() + (campaignConfig.sessionDurationInMinutes * 60 * 1000),
		};
		isReturning = false;
	}

	// Now evaluate the campaign with session data
	const evaluation = evaluateCampaign(c, campaignConfig, session, isReturning);

	// For new users, we'll need to handle variant selection at the worker level
	// The worker will call the Durable Object's selectVariant() method
	if (!isReturning) {
		if (evaluation.landingPageId) {
			// Store landing page for non-AB test scenarios
			session.landingPageId = evaluation.landingPageId;
		} else if (campaignConfig.defaultLandingPageId) {
			session.landingPageId = campaignConfig.defaultLandingPageId;
		}
		// Note: AB test variant selection will be handled by the worker
		// The worker will update the session after calling the DO
	}

	return {
		evaluation,
		session,
		attribution,
		isReturning,
	};
}
