import { z } from "zod";

export const RuleTypeIdSchema = z.enum([
	"visitorType",
	"country",
	"isEUCountry",
	"language",
	"deviceType",
	"browser",
	"operatingSystem",
	"utmSource",
	"utmMedium",
	"utmCampaign",
	"utmTerm",
	"utmContent",
	"referrer",
	"customParameter",
	"timeZone",
	"hourOfDay",
	"dayOfWeek",
]);

export const FilterOperatorSchema = z.enum([
	"equals",
	"not_equals",
	"greater_than",
	"less_than",
	"between",
	"in",
	"not_in",
	"contains",
	"not_contains",
	"starts_with",
	"ends_with",
]);

export const SegmentRuleSchema = z.object({
	id: z.string(),
	ruleType: RuleTypeIdSchema,
	operator: FilterOperatorSchema,
	value: z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.array(z.string()),
		z.array(z.number()),
	]),
	isRequired: z.boolean(),
});

export const ABTestVariantSchema = z.object({
	id: z.string(),
	name: z.string(),
	landingPageId: z.string().optional(),
	trafficAllocation: z.number(),
	isControl: z.boolean(),
});

export const ABTestSchema = z.object({
	id: z.string(),
	title: z.string(),
	status: z.enum(["draft", "running", "completed", "paused"]),
	hypothesis: z.string(),
	isCompleted: z.boolean(),
	startedAt: z.string().optional(),
	completedAt: z.string().optional(),
	pausedAt: z.string().optional(),
	resumedAt: z.string().optional(),
	endDate: z.string().optional(),
	primaryMetric: z.string(),
	completionCriteria: z.object({
		sampleSizePerVariant: z.number(),
		testDuration: z.number(),
	}),
	confidenceLevel: z.union([z.literal(90), z.literal(95), z.literal(99)]),
	rules: z.object({
		winningStrategy: z.enum(["winner", "winnerOrControl"]),
	}),
	poolingPercent: z.number(),
	variants: z.array(ABTestVariantSchema),
	winner: z.string().optional(),
});

export const EventSchema = z.object({
	id: z.string(),
	title: z.string(),
	icon: z.string(),
	description: z.string().optional(),
	direction: z.enum(["up", "down"]),
	placement: z.enum(["internal", "external"]),
	value: z.number(),
	currency: z.string().optional(),
	type: z.enum(["conversion", "engagement"]),
	isCustom: z.boolean(),
});

export const SegmentSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string(),
	priority: z.number(),
	primaryLandingPageId: z.string().optional(),
	translationMode: z.enum(["disabled", "auto-detect", "parameter"]),
	translations: z
		.array(
			z.object({
				id: z.string(),
				language: z.string(),
				title: z.string(),
			}),
		)
		.optional(),
	rules: z.array(SegmentRuleSchema),
	abTests: z.array(ABTestSchema).optional(),
});

export const CampaignConfigSchema = z.object({
	campaignId: z.string(),
	defaultLandingPageId: z.string().optional(),
	primaryLanguage: z.string(),
	segments: z.array(SegmentSchema),
	sessionDurationInMinutes: z.number(),
	attributionPeriodInDays: z.number(),
	primaryGoal: EventSchema,
	customEvents: z.array(EventSchema),
});

// Inferred types
export type RuleTypeId = z.infer<typeof RuleTypeIdSchema>;
export type FilterOperator = z.infer<typeof FilterOperatorSchema>;
export type SegmentRule = z.infer<typeof SegmentRuleSchema>;
export type ABTestVariant = z.infer<typeof ABTestVariantSchema>;
export type ABTest = z.infer<typeof ABTestSchema>;
export type Event = z.infer<typeof EventSchema>;
export type Segment = z.infer<typeof SegmentSchema>;
export type CampaignConfig = z.infer<typeof CampaignConfigSchema>;
