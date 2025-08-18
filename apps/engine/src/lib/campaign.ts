import type { Context } from 'hono';
import type { 
	CampaignConfig, 
	Segment, 
	SegmentRule,
	ABTest 
} from '../types/campaign';
import { parseRequest, type RequestData } from './request';

// ============================================================================
// Campaign Evaluation Types
// ============================================================================

export interface CampaignEvaluationResult {
	type: 'default' | 'segment' | 'abtest';
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
 * @param c Hono context containing the request
 * @param campaignConfig The campaign configuration to evaluate
 * @returns The evaluation result with the selected segment or default
 */
export function evaluateCampaign(
	c: Context,
	campaignConfig: CampaignConfig,
): CampaignEvaluationResult {
	const requestData = parseRequest(c);
	
	// Sort segments by priority (lower number = higher priority)
	const sortedSegments = [...campaignConfig.segments].sort(
		(a, b) => a.priority - b.priority
	);
	
	// Evaluate each segment in priority order
	for (const segment of sortedSegments) {
		if (evaluateSegment(requestData, segment)) {
			// Check if segment has active AB test
			const activeABTest = segment.abTests?.find(
				test => test.status === 'running'
			);
			
			if (activeABTest) {
				return {
					type: 'abtest',
					segmentId: segment.id,
					abTest: activeABTest,
					matchedSegment: segment,
				};
			}
			
			// Return the segment with its primary landing page
			return {
				type: 'segment',
				segmentId: segment.id,
				landingPageId: segment.primaryLandingPageId,
				matchedSegment: segment,
			};
		}
	}
	
	// No segment matched, return default
	return {
		type: 'default',
		landingPageId: campaignConfig.defaultVariantId,
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
function evaluateSegment(
	requestData: RequestData,
	segment: Segment,
): boolean {
	// If no rules, segment always matches
	if (!segment.rules || segment.rules.length === 0) {
		return true;
	}
	
	// All rules must match (AND logic)
	return segment.rules.every(rule => evaluateRule(requestData, rule));
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
function evaluateRule(
	requestData: RequestData,
	rule: SegmentRule,
): boolean {
	try {
		switch (rule.ruleType) {
			case 'visitorType':
				// For now, always match "all" visitor type
				// TODO: Implement visitor tracking with cookies/storage
				return rule.value === 'all';
			
			case 'country':
				return evaluateStringRule(
					requestData.geo.country,
					rule.operator,
					rule.value
				);
			
			case 'isEUCountry':
				return evaluateBooleanRule(
					requestData.geo.isEUCountry,
					rule.operator,
					rule.value
				);
			
			case 'language':
				return evaluateStringRule(
					requestData.localization.language,
					rule.operator,
					rule.value
				);
			
			case 'deviceType':
				return evaluateStringRule(
					requestData.device.type,
					rule.operator,
					rule.value
				);
			
			case 'browser':
				return evaluateStringRule(
					requestData.device.browser.toLowerCase(),
					rule.operator,
					rule.value
				);
			
			case 'operatingSystem':
				return evaluateStringRule(
					requestData.device.os.toLowerCase(),
					rule.operator,
					rule.value
				);
			
			case 'utmSource':
				return evaluateStringRule(
					requestData.params.utm.utm_source,
					rule.operator,
					rule.value
				);
			
			case 'utmMedium':
				return evaluateStringRule(
					requestData.params.utm.utm_medium,
					rule.operator,
					rule.value
				);
			
			case 'utmCampaign':
				return evaluateStringRule(
					requestData.params.utm.utm_campaign,
					rule.operator,
					rule.value
				);
			
			case 'utmTerm':
				return evaluateStringRule(
					requestData.params.utm.utm_term,
					rule.operator,
					rule.value
				);
			
			case 'utmContent':
				return evaluateStringRule(
					requestData.params.utm.utm_content,
					rule.operator,
					rule.value
				);
			
			case 'referrer':
				return evaluateStringRule(
					requestData.traffic.referrer,
					rule.operator,
					rule.value
				);
			
			case 'customParameter':
				// For custom parameters, we need to check if the parameter exists
				// The value in the rule should be in format "paramName:paramValue"
				if (typeof rule.value === 'string' && rule.value.includes(':')) {
					const [paramName, paramValue] = rule.value.split(':', 2);
					return evaluateStringRule(
						requestData.params.custom[paramName],
						rule.operator,
						paramValue
					);
				}
				return false;
			
			case 'timeZone':
				return evaluateStringRule(
					requestData.geo.timezone,
					rule.operator,
					rule.value
				);
			
			case 'hourOfDay': {
				// Get current hour in user's timezone
				const hour = new Date().getHours(); // TODO: Use user's timezone
				return evaluateNumberRule(hour, rule.operator, rule.value);
			}
			
			case 'dayOfWeek': {
				// Get current day of week
				const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
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
	const actualValue = actual?.toLowerCase() || '';
	
	switch (operator) {
		case 'equals':
			return actualValue === String(expected).toLowerCase();
		
		case 'not_equals':
			return actualValue !== String(expected).toLowerCase();
		
		case 'contains':
			return actualValue.includes(String(expected).toLowerCase());
		
		case 'not_contains':
			return !actualValue.includes(String(expected).toLowerCase());
		
		case 'starts_with':
			return actualValue.startsWith(String(expected).toLowerCase());
		
		case 'ends_with':
			return actualValue.endsWith(String(expected).toLowerCase());
		
		case 'in':
			if (Array.isArray(expected)) {
				return expected.some(val => 
					actualValue === String(val).toLowerCase()
				);
			}
			return false;
		
		case 'not_in':
			if (Array.isArray(expected)) {
				return !expected.some(val => 
					actualValue === String(val).toLowerCase()
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
		case 'equals':
			return actual === Number(expected);
		
		case 'not_equals':
			return actual !== Number(expected);
		
		case 'greater_than':
			return actual > Number(expected);
		
		case 'less_than':
			return actual < Number(expected);
		
		case 'between':
			if (Array.isArray(expected) && expected.length >= 2) {
				const min = Number(expected[0]);
				const max = Number(expected[1]);
				return actual >= min && actual <= max;
			}
			return false;
		
		case 'in':
			if (Array.isArray(expected)) {
				return expected.some(val => actual === Number(val));
			}
			return false;
		
		case 'not_in':
			if (Array.isArray(expected)) {
				return !expected.some(val => actual === Number(val));
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
		case 'equals':
			return actual === (expected === true || expected === 'true');
		
		case 'not_equals':
			return actual !== (expected === true || expected === 'true');
		
		default:
			return false;
	}
}