export interface CampaignConfig {
	defaultLandingPageId: string;
	primaryLanguage: string;
	segments: Segment[];
	sessionDurationInMinutes: number;
	attributionPeriodInDays: number;
	primaryGoal: Goal;
	customGoals: Goal[];
}

export interface Segment {
	id: string;
	title: string;
	description: string;
	priority: number;
	primaryLandingPageId?: string;
	translationMode: 'disabled' | 'auto-detect' | 'parameter';
	translations?: Array<{
		id: string;
		language: string;
		title: string;
	}>;
	rules: SegmentRule[];
	abTests?: ABTest[];
}

export type RuleTypeId =
	| 'visitorType'
	| 'country'
	| 'isEUCountry'
	| 'language'
	| 'deviceType'
	| 'browser'
	| 'operatingSystem'
	| 'utmSource'
	| 'utmMedium'
	| 'utmCampaign'
	| 'utmTerm'
	| 'utmContent'
	| 'referrer'
	| 'customParameter'
	| 'timeZone'
	| 'hourOfDay'
	| 'dayOfWeek';

export type FilterOperator =
	| 'equals'
	| 'not_equals'
	| 'greater_than'
	| 'less_than'
	| 'between'
	| 'in'
	| 'not_in'
	| 'contains'
	| 'not_contains'
	| 'starts_with'
	| 'ends_with';

export interface SegmentRule {
	id: string;
	ruleType: RuleTypeId;
	operator: FilterOperator;
	value: string | number | boolean | string[] | number[];
	isRequired: boolean;
}

export interface ABTest {
	id: string;
	title: string;
	status: 'draft' | 'running' | 'completed' | 'paused';
	hypothesis: string;
	isCompleted: boolean;
	startedAt?: string;
	completedAt?: string;
	pausedAt?: string;
	resumedAt?: string;
	endDate?: string;
	primaryMetric: string;
	completionCriteria: {
		sampleSizePerVariant?: number;
		testDuration?: number;
	};
	confidenceLevel: 90 | 95 | 99;
	rules: {
		winningStrategy: 'winner' | 'winnerOrControl';
	};
	poolingPercent: number;
	variants: ABTestVariant[];
	winner?: string;
}

export interface ABTestVariant {
	id: string;
	name: string;
	landingPageId?: string;
	trafficAllocation: number;
	isControl: boolean;
}

export interface Goal {
	id: string;
	title: string;
	description?: string;
	direction: 'up' | 'down';
	placement: 'internal' | 'external';
	value: number;
	currency?: string;
	type: 'conversion' | 'engagement';
	isCustom: boolean;
}
