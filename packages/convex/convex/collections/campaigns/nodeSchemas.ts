import { type Infer, v } from "convex/values";

export const campaignNodeTypes = v.union(
	v.literal("traffic"),
	v.literal("ab-test"),
	v.literal("segment"),
	v.literal("advanced-targeting"),
	v.literal("variant"),
);

export const formNodeTypes = v.union(v.literal("form"));

export const filterOperator = v.union(
	v.literal("equals"),
	v.literal("not_equals"),
	v.literal("greater_than"),
	v.literal("less_than"),
	v.literal("between"),
	v.literal("in"),
	v.literal("not_in"),
	v.literal("contains"),
	v.literal("not_contains"),
	v.literal("starts_with"),
	v.literal("ends_with"),
);

export const ruleValueType = v.union(
	v.literal("string"),
	v.literal("number"),
	v.literal("boolean"),
	v.literal("array"),
	v.literal("date"),
);

export const ruleTypeId = v.union(
	v.literal("visitorType"),
	v.literal("country"),
	v.literal("language"),
	v.literal("deviceType"),
	v.literal("browser"),
	v.literal("operatingSystem"),
	v.literal("utmSource"),
	v.literal("utmMedium"),
	v.literal("referrer"),
	v.literal("customParameter"),
	v.literal("timeZone"),
	v.literal("hourOfDay"),
	v.literal("dayOfWeek"),
);

export const trafficNodeData = v.object({
	title: v.string(),
	description: v.string(),
	isHovered: v.optional(v.boolean()),
	defaultVariantId: v.optional(v.id("landingPages")),
});

export const segmentRule = v.object({
	id: v.string(),
	ruleType: ruleTypeId,
	operator: filterOperator,
	value: v.union(
		v.string(),
		v.number(),
		v.boolean(),
		v.array(v.string()),
		v.array(v.number()),
	),
	label: v.string(),
	isRequired: v.optional(v.boolean()),
});

export const segmentNodeData = v.object({
	title: v.string(),
	description: v.string(),
	isHovered: v.optional(v.boolean()),
	priority: v.number(),
	primaryLandingPageId: v.optional(v.id("landingPages")),
	rules: v.array(segmentRule),
});

export const abTestVariant = v.object({
	id: v.string(),
	isControl: v.boolean(),
	name: v.string(),
	landingPageId: v.optional(v.id("landingPages")),
	trafficAllocation: v.number(),
});

export const abTestNodeData = v.object({
	title: v.string(),
	description: v.string(),
	isHovered: v.optional(v.boolean()),
	hypothesis: v.string(),
	status: v.union(
		v.literal("draft"),
		v.literal("running"),
		v.literal("completed"),
		v.literal("paused"),
	),
	isCompleted: v.boolean(),
	startedAt: v.optional(v.string()),
	completedAt: v.optional(v.string()),
	pausedAt: v.optional(v.string()),
	resumedAt: v.optional(v.string()),
	endDate: v.optional(v.string()),
	primaryMetric: v.string(),
	completionCriteria: v.object({
		sampleSizePerVariant: v.optional(v.number()),
		testDuration: v.optional(v.number()),
	}),
	confidenceLevel: v.union(v.literal(90), v.literal(95), v.literal(99)),
	variants: v.array(abTestVariant),
	rules: v.object({
		winningStrategy: v.union(v.literal("winner"), v.literal("winnerOrControl")),
	}),
	winner: v.optional(v.string()), // ID of the winning variant when test is completed
	poolingPercent: v.optional(v.number()), // Default 20% - controls how much traffic goes to A/B test from segment
});

export const variantTranslation = v.object({
	id: v.string(),
	language: v.string(),
	title: v.string(),
});

export const variantNodeData = v.object({
	title: v.string(),
	description: v.string(),
	isHovered: v.optional(v.boolean()),
	variantId: v.optional(v.id("landingPages")),
	trafficPercentage: v.number(),
	translations: v.array(variantTranslation),
	isControl: v.optional(v.boolean()),
	variantIndex: v.number(),
});

export const noteNodeData = v.object({
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	isHovered: v.optional(v.boolean()),
	content: v.string(),
	author: v.string(),
});

// Form field schema for form nodes
export const formFieldNodeSchema = v.object({
	id: v.string(),
	title: v.string(),
	placeholder: v.optional(v.string()),
	description: v.optional(v.string()),
	type: v.union(v.literal("string"), v.literal("number"), v.literal("boolean")),
	inputType: v.union(
		v.literal("text"),
		v.literal("number"),
		v.literal("checkbox"),
		v.literal("radio"),
		v.literal("select"),
		v.literal("textarea"),
		v.literal("date"),
		v.literal("time"),
		v.literal("email"),
		v.literal("url"),
		v.literal("tel"),
		v.literal("password"),
	),
	required: v.boolean(),
	unique: v.boolean(),
	visible: v.boolean(),
	default: v.optional(v.union(v.string(), v.number(), v.boolean())),
	options: v.optional(
		v.array(
			v.object({
				label: v.string(),
				value: v.string(),
			}),
		),
	),
});

export const formNodeData = v.object({
	title: v.string(),
	description: v.optional(v.string()),
	isHovered: v.optional(v.boolean()),
	schema: v.array(formFieldNodeSchema),
	submitButtonText: v.string(),
	successMessage: v.string(),
	successRedirectUrl: v.optional(v.string()),
});

export const nodeDataSchema = v.union(
	trafficNodeData,
	segmentNodeData,
	abTestNodeData,
	variantNodeData,
	noteNodeData,
	formNodeData,
);

// Edge data schemas
export const trafficWeightEdgeData = v.object({
	trafficPercentage: v.optional(v.number()),
});

export const edgeDataSchema = v.union(
	trafficWeightEdgeData,
	v.object({}), // For edges with no data
);

// Export type helpers for easy access
export type TrafficNodeData = Infer<typeof trafficNodeData>;
export type SegmentNodeData = Infer<typeof segmentNodeData>;
export type ABTestNodeData = Infer<typeof abTestNodeData>;
export type VariantNodeData = Infer<typeof variantNodeData>;
export type NoteNodeData = Infer<typeof noteNodeData>;
export type FormNodeData = Infer<typeof formNodeData>;
export type FormField = Infer<typeof formFieldNodeSchema>;
export type EdgeData = Infer<typeof edgeDataSchema>;

// Export additional types
export type FilterOperator = Infer<typeof filterOperator>;
export type RuleValueType = Infer<typeof ruleValueType>;
export type RuleTypeId = Infer<typeof ruleTypeId>;
export type SegmentRule = Infer<typeof segmentRule>;

// Validation types
export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationItem {
	id: string;
	isValid: boolean;
	message: string;
	severity: ValidationSeverity;
	field?: string;
	priority?: number;
}

export interface ValidationResult {
	nodeId: string;
	nodeType: string;
	nodeTitle: string;
	validations: ValidationItem[];
}

// React Flow validators - moved from types.ts
export const nodeChangeValidator = v.any();
export const edgeChangeValidator = v.any();

// Connection validator for new edge connections
export const connectionValidator = v.object({
	source: v.string(),
	target: v.string(),
	sourceHandle: v.optional(v.string()),
	targetHandle: v.optional(v.string()),
});

// Viewport change validator
export const viewportChangeValidator = v.object({
	x: v.number(),
	y: v.number(),
	zoom: v.number(),
});
