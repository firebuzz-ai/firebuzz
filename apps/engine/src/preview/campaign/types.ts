export interface CampaignConfig {
	defaultVariantId?: string;
	segments: Segment[];
}

export interface Segment {
	id: string;
	title: string;
	description: string;
	priority: number;
	primaryLandingPageId?: string;
	translationMode: "disabled" | "auto-detect" | "parameter";
	rules: SegmentRule[];
	abTests?: ABTest[];
	variants?: Variant[];
}

export interface SegmentRule {
	id: string;
	ruleType: string;
	operator: string;
	value: string | number | boolean | string[] | number[];
	label: string;
	isRequired?: boolean;
}

export interface ABTest {
	id: string;
	title: string;
	description: string;
	status: "draft" | "running" | "completed" | "paused";
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

export interface Variant {
	id: string;
	title: string;
	landingPageId?: string;
	trafficPercentage: number;
	translations?: Translation[];
}

export interface Translation {
	id: string;
	language: string;
	title: string;
}
