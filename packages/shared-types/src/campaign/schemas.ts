import { zid } from "convex-helpers/server/zod";
import { z } from "zod";

// Base enums and literals
export const campaignNodeTypesSchema = z.union([
	z.literal("traffic"),
	z.literal("ab-test"),
	z.literal("segment"),
	z.literal("advanced-targeting"),
	z.literal("variant"),
]);

export const formNodeTypesSchema = z.literal("form");

export const filterOperatorSchema = z.union([
	z.literal("equals"),
	z.literal("not_equals"),
	z.literal("greater_than"),
	z.literal("less_than"),
	z.literal("between"),
	z.literal("in"),
	z.literal("not_in"),
	z.literal("contains"),
	z.literal("not_contains"),
	z.literal("starts_with"),
	z.literal("ends_with"),
]);

export const ruleValueTypeSchema = z.union([
	z.literal("string"),
	z.literal("number"),
	z.literal("boolean"),
	z.literal("array"),
	z.literal("date"),
]);

export const ruleTypeIdSchema = z.union([
	z.literal("visitorType"),
	z.literal("country"),
	z.literal("isEUCountry"),
	z.literal("language"),
	z.literal("deviceType"),
	z.literal("browser"),
	z.literal("operatingSystem"),
	z.literal("utmSource"),
	z.literal("utmMedium"),
	z.literal("utmCampaign"),
	z.literal("utmTerm"),
	z.literal("utmContent"),
	z.literal("referrer"),
	z.literal("customParameter"),
	z.literal("timeZone"),
	z.literal("hourOfDay"),
	z.literal("dayOfWeek"),
]);

export const translationModeSchema = z.union([
	z.literal("disabled"),
	z.literal("auto-detect"),
	z.literal("parameter"),
]);

// Node data schemas
export const trafficNodeDataSchema = z.object({
	title: z.string(),
	description: z.string(),
	isHovered: z.boolean().optional(),
	defaultLandingPageId: zid("landingPages").optional(),
});

export const segmentRuleSchema = z.object({
	id: z.string(),
	ruleType: ruleTypeIdSchema,
	operator: filterOperatorSchema,
	value: z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.array(z.string()),
		z.array(z.number()),
	]),
	label: z.string(),
	isRequired: z.boolean().optional(),
});

export const segmentNodeDataSchema = z.object({
	title: z.string(),
	description: z.string(),
	isHovered: z.boolean().optional(),
	priority: z.number(),
	primaryLandingPageId: zid("landingPages").optional(),
	translationMode: translationModeSchema,
	translations: z.array(
		z.object({
			language: z.string(),
			landingPageId: zid("landingPages"),
		}),
	),
	rules: z.array(segmentRuleSchema),
});

export const abTestVariantSchema = z.object({
	id: z.string(),
	isControl: z.boolean(),
	name: z.string(),
	landingPageId: zid("landingPages").optional(),
	trafficAllocation: z.number(),
});

export const abTestNodeDataSchema = z.object({
	title: z.string(),
	description: z.string(),
	isHovered: z.boolean().optional(),
	hypothesis: z.string(),
	status: z.union([
		z.literal("draft"),
		z.literal("running"),
		z.literal("completed"),
		z.literal("paused"),
	]),
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
	variants: z.array(abTestVariantSchema),
	rules: z.object({
		winningStrategy: z.union([
			z.literal("winner"),
			z.literal("winnerOrControl"),
		]),
	}),
	winner: z.string().optional(),
	poolingPercent: z.number().optional(),
});

export const variantNodeDataSchema = z.object({
	title: z.string(),
	description: z.string(),
	isHovered: z.boolean().optional(),
	variantId: zid("landingPages").optional(),
	trafficPercentage: z.number(),
	isControl: z.boolean().optional(),
	variantIndex: z.number(),
});

export const noteNodeDataSchema = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
	isHovered: z.boolean().optional(),
	content: z.string(),
	author: z.string(),
});

// Form field schema
export const formFieldNodeSchema = z.object({
	id: z.string(),
	title: z.string(),
	placeholder: z.string().optional(),
	description: z.string().optional(),
	type: z.union([
		z.literal("string"),
		z.literal("number"),
		z.literal("boolean"),
	]),
	inputType: z.union([
		z.literal("text"),
		z.literal("number"),
		z.literal("checkbox"),
		z.literal("radio"),
		z.literal("select"),
		z.literal("textarea"),
		z.literal("date"),
		z.literal("time"),
		z.literal("email"),
		z.literal("url"),
		z.literal("tel"),
		z.literal("password"),
	]),
	required: z.boolean(),
	unique: z.boolean(),
	visible: z.boolean(),
	default: z.union([z.string(), z.number(), z.boolean()]).optional(),
	options: z
		.array(
			z.object({
				label: z.string(),
				value: z.string(),
			}),
		)
		.optional(),
});

export const formNodeDataSchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	isHovered: z.boolean().optional(),
	schema: z.array(formFieldNodeSchema),
	submitButtonText: z.string(),
	successMessage: z.string(),
	successRedirectUrl: z.string().optional(),
});

export const nodeDataSchema = z.union([
	trafficNodeDataSchema,
	segmentNodeDataSchema,
	abTestNodeDataSchema,
	variantNodeDataSchema,
	noteNodeDataSchema,
	formNodeDataSchema,
]);

// Edge data schemas
export const trafficWeightEdgeDataSchema = z.object({
	trafficPercentage: z.number().optional(),
});

export const edgeDataSchema = z.union([
	trafficWeightEdgeDataSchema,
	z.object({}), // For edges with no data
]);

// React Flow validators
export const nodeChangeValidatorSchema = z.any();
export const edgeChangeValidatorSchema = z.any();

export const connectionValidatorSchema = z.object({
	source: z.string(),
	target: z.string(),
	sourceHandle: z.string().optional(),
	targetHandle: z.string().optional(),
});

export const viewportChangeValidatorSchema = z.object({
	x: z.number(),
	y: z.number(),
	zoom: z.number(),
});

// Validation types
export const validationSeveritySchema = z.union([
	z.literal("error"),
	z.literal("warning"),
	z.literal("info"),
]);

export const validationItemSchema = z.object({
	id: z.string(),
	isValid: z.boolean(),
	message: z.string(),
	severity: validationSeveritySchema,
	field: z.string().optional(),
	priority: z.number().optional(),
});

export const validationResultSchema = z.object({
	nodeId: z.string(),
	nodeType: z.string(),
	nodeTitle: z.string(),
	validations: z.array(validationItemSchema),
});

// Edge schema for React Flow
export const edgeSchema = z.object({
	id: z.string(),
	source: z.string(),
	target: z.string(),
	type: z.string().optional(),
	animated: z.boolean().optional(),
	hidden: z.boolean().optional(),
	selected: z.boolean().optional(),
	data: edgeDataSchema.optional(),
});

// Viewport schema for React Flow canvas
export const viewportSchema = z.object({
	x: z.number(),
	y: z.number(),
	zoom: z.number(),
});

// Node schema for React Flow
export const nodeSchema = z.object({
	id: z.string(),
	type: z.string().optional(),
	position: z.object({
		x: z.number(),
		y: z.number(),
	}),
	resizing: z.boolean().optional(),
	dragging: z.boolean().optional(),
	selected: z.boolean().optional(),
	hidden: z.boolean().optional(),
	parentId: z.string().optional(),
	measured: z
		.object({
			width: z.number().optional(),
			height: z.number().optional(),
		})
		.optional(),
	data: nodeDataSchema,
	dragHandle: z.string().optional(),
	width: z.number().optional(),
	height: z.number().optional(),
	initialWidth: z.number().optional(),
	initialHeight: z.number().optional(),
	zIndex: z.number().optional(),
	handles: z.array(z.any()).optional(),
});

// Event schema for goals and tracking
export const eventSchema = z.object({
	id: z.string(),
	title: z.string(),
	icon: z.string(),
	description: z.string().optional(),
	direction: z.union([z.literal("up"), z.literal("down")]),
	placement: z.union([z.literal("internal"), z.literal("external")]),
	value: z.number(),
	currency: z.string().optional(),
	type: z.union([z.literal("conversion"), z.literal("engagement")]),
	isCustom: z.boolean(),
});

export const gdprSchema = z.object({
	enabled: z.boolean(),
	geoLocation: z.boolean(),
	localization: z.boolean(),
	includedCountries: z.array(z.string()).optional(),
	respectDNT: z.boolean(),
	privacyPolicyUrl: z.string().optional(),
	termsOfServiceUrl: z.string().optional(),
});

// Campaign settings schema
export const campaignSettingsSchema = z.object({
	primaryGoal: eventSchema,
	customEvents: z.array(eventSchema).optional(),
	ctaLink: z.string().url().optional(),
	gdpr: gdprSchema,
});
