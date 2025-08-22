import type {
	ABTestNodeData,
	ABTestVariant,
	FilterOperator,
	RuleTypeId,
	SegmentNodeData,
	SegmentRule,
} from "./types";
import type { CampaignEvent } from "./types";

// Re-export Event as the correct CampaignEvent type
export type Event = CampaignEvent;

// Cleaned types using Pick utility types from existing schemas
export type CleanedSegmentRule = Pick<
	SegmentRule,
	"id" | "value" | "isRequired"
> & {
	ruleType: RuleTypeId;
	operator: FilterOperator;
};

export type CleanedABTestVariant = Pick<
	ABTestVariant,
	"id" | "name" | "landingPageId" | "trafficAllocation" | "isControl"
>;

export type CleanedSegment = Pick<
	SegmentNodeData,
	| "title"
	| "priority"
	| "primaryLandingPageId"
	| "translationMode"
	| "translations"
> & {
	id: string;
	rules: CleanedSegmentRule[];
	abTests?: CleanedABTest[];
};

export type CleanedABTest = Pick<
	ABTestNodeData,
	| "title"
	| "status"
	| "winner"
	| "hypothesis"
	| "isCompleted"
	| "startedAt"
	| "completedAt"
	| "pausedAt"
	| "resumedAt"
	| "endDate"
	| "primaryMetric"
	| "completionCriteria"
	| "confidenceLevel"
	| "rules"
> & {
	id: string;
	poolingPercent: number;
	variants: CleanedABTestVariant[];
};

// Main campaign config interface
export interface CampaignConfig {
	campaignId: string;
	defaultLandingPageId?: string;
	primaryLanguage: string;
	segments: CleanedSegment[];
	sessionDurationInMinutes: number;
	attributionPeriodInDays: number;
	primaryGoal: Event;
	customEvents: Event[];
}

// Validation result interface
export interface ConfigValidationResult {
	isValid: boolean;
	errors: string[];
}
