import type { z } from "zod";
import type {
	abTestNodeDataSchema,
	abTestVariantSchema,
	campaignNodeTypesSchema,
	campaignSettingsSchema,
	connectionValidatorSchema,
	edgeChangeValidatorSchema,
	edgeDataSchema,
	edgeSchema,
	eventSchema,
	filterOperatorSchema,
	formFieldNodeSchema,
	formNodeDataSchema,
	formNodeTypesSchema,
	gdprSchema,
	nodeChangeValidatorSchema,
	nodeDataSchema,
	nodeSchema,
	noteNodeDataSchema,
	ruleTypeIdSchema,
	ruleValueTypeSchema,
	segmentNodeDataSchema,
	segmentRuleSchema,
	trafficNodeDataSchema,
	trafficWeightEdgeDataSchema,
	translationModeSchema,
	validationItemSchema,
	validationResultSchema,
	validationSeveritySchema,
	variantNodeDataSchema,
	viewportChangeValidatorSchema,
	viewportSchema,
} from "./schemas";

// Inferred types from schemas
export type CampaignNodeTypes = z.infer<typeof campaignNodeTypesSchema>;
export type FormNodeTypes = z.infer<typeof formNodeTypesSchema>;
export type FilterOperator = z.infer<typeof filterOperatorSchema>;
export type RuleValueType = z.infer<typeof ruleValueTypeSchema>;
export type RuleTypeId = z.infer<typeof ruleTypeIdSchema>;
export type TranslationMode = z.infer<typeof translationModeSchema>;

// Node data types
export type TrafficNodeData = z.infer<typeof trafficNodeDataSchema>;
export type SegmentNodeData = z.infer<typeof segmentNodeDataSchema>;
export type SegmentRule = z.infer<typeof segmentRuleSchema>;
export type ABTestNodeData = z.infer<typeof abTestNodeDataSchema>;
export type ABTestVariant = z.infer<typeof abTestVariantSchema>;
export type VariantNodeData = z.infer<typeof variantNodeDataSchema>;
export type NoteNodeData = z.infer<typeof noteNodeDataSchema>;
export type FormNodeData = z.infer<typeof formNodeDataSchema>;
export type FormField = z.infer<typeof formFieldNodeSchema>;
export type NodeData = z.infer<typeof nodeDataSchema>;

// Edge data types
export type TrafficWeightEdgeData = z.infer<typeof trafficWeightEdgeDataSchema>;
export type EdgeData = z.infer<typeof edgeDataSchema>;

// React Flow types
export type NodeChangeValidator = z.infer<typeof nodeChangeValidatorSchema>;
export type EdgeChangeValidator = z.infer<typeof edgeChangeValidatorSchema>;
export type ConnectionValidator = z.infer<typeof connectionValidatorSchema>;
export type ViewportChangeValidator = z.infer<
	typeof viewportChangeValidatorSchema
>;

// Validation types
export type ValidationSeverity = z.infer<typeof validationSeveritySchema>;
export type ValidationItem = z.infer<typeof validationItemSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;

// React Flow types
export type Edge = z.infer<typeof edgeSchema>;
export type Viewport = z.infer<typeof viewportSchema>;
export type Node = z.infer<typeof nodeSchema>;

// Campaign event and settings types
export type CampaignEvent = z.infer<typeof eventSchema>;
export type CampaignSettings = z.infer<typeof campaignSettingsSchema>;
export type Gdpr = z.infer<typeof gdprSchema>;
