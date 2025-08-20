import type { Infer } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import type {
	ABTestNodeData,
	FilterOperator,
	RuleTypeId,
	SegmentNodeData,
	SegmentRule,
	TrafficNodeData,
	VariantNodeData,
	abTestVariant,
} from "../nodeSchemas";
import type { edgeSchema, nodeSchema } from "../schema";

type Node = Infer<typeof nodeSchema>;
type Edge = Infer<typeof edgeSchema>;

// Types for the cleaned config structure derived from nodeSchemas.ts
export type CleanedSegmentRule = Pick<
	SegmentRule,
	"id" | "value" | "isRequired"
> & {
	ruleType: RuleTypeId;
	operator: FilterOperator;
};

export type CleanedABTestVariant = Pick<
	Infer<typeof abTestVariant>,
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

export type Goal = Doc<"campaigns">["campaignSettings"]["primaryGoal"];

export interface CampaignConfig {
	campaignId: string;
	defaultLandingPageId?: string;
	primaryLanguage: string;
	segments: CleanedSegment[];
	sessionDurationInMinutes: number;
	attributionPeriodInDays: number;
	primaryGoal: Goal;
	customGoals: Goal[];
}

/**
 * Clean React Flow nodes and edges into a config structure for CF Worker
 */
export function buildCampaignConfig(
	nodes: Node[],
	edges: Edge[],
	settings: Doc<"campaigns">["campaignSettings"],
	campaign: Pick<Doc<"campaigns">, "_id" | "primaryLanguage">,
): CampaignConfig {
	// Find the traffic node (root node)
	const trafficNode = nodes.find((node) => node.type === "traffic");
	if (!trafficNode) {
		throw new Error("No traffic node found in campaign");
	}

	const trafficData = trafficNode.data as TrafficNodeData;
	const config: CampaignConfig = {
		campaignId: campaign._id,
		defaultLandingPageId: trafficData.defaultLandingPageId,
		primaryLanguage: campaign.primaryLanguage,
		segments: [],
		sessionDurationInMinutes: settings.sessionDurationInMinutes,
		attributionPeriodInDays: settings.attributionPeriodInDays,
		primaryGoal: settings.primaryGoal,
		customGoals: settings.customGoals || [],
	};

	// Get all segments connected to traffic node
	const segmentEdges = edges.filter((edge) => edge.source === trafficNode.id);
	const segmentNodes = segmentEdges
		.map((edge) => nodes.find((node) => node.id === edge.target))
		.filter((node): node is Node => node?.type === "segment");

	// Process each segment
	for (const segmentNode of segmentNodes) {
		const segmentData = segmentNode.data as SegmentNodeData;
		const cleanedSegment: CleanedSegment = {
			id: segmentNode.id,
			title: segmentData.title,
			priority: segmentData.priority,
			primaryLandingPageId: segmentData.primaryLandingPageId,
			translationMode: segmentData.translationMode || "disabled",
			translations: segmentData.translations,
			rules: segmentData.rules.map((rule) => cleanRule(rule)),
			abTests: [],
		};

		// Find connections from this segment
		const segmentOutEdges = edges.filter(
			(edge) => edge.source === segmentNode.id,
		);

		for (const edge of segmentOutEdges) {
			const targetNode = nodes.find((node) => node.id === edge.target);
			if (!targetNode) continue;

			if (targetNode.type === "ab-test") {
				// Process A/B test node
				const abTestData = targetNode.data as ABTestNodeData;

				// Find variant nodes connected to this AB test
				const abTestOutEdges = edges.filter(
					(edge) => edge.source === targetNode.id,
				);
				const variantNodes = abTestOutEdges
					.map((edge) => nodes.find((node) => node.id === edge.target))
					.filter((node): node is Node => node?.type === "variant");

				// Build variants array from connected variant nodes
				const variants: CleanedABTestVariant[] = variantNodes.map(
					(variantNode) => {
						const variantData = variantNode.data as VariantNodeData;
						return {
							id: variantNode.id,
							name: variantData.title,
							landingPageId: variantData.variantId,
							trafficAllocation: variantData.trafficPercentage,
							isControl: variantData.isControl || false,
						};
					},
				);

				// If no variant nodes are connected, fall back to variants in AB test data
				const finalVariants =
					variants.length > 0
						? variants
						: abTestData.variants.map((variant) => ({
								id: variant.id,
								name: variant.name,
								landingPageId: variant.landingPageId,
								trafficAllocation: variant.trafficAllocation,
								isControl: variant.isControl,
							}));

				const cleanedABTest: CleanedABTest = {
					id: targetNode.id,
					title: abTestData.title,
					status: abTestData.status,
					hypothesis: abTestData.hypothesis,
					isCompleted: abTestData.isCompleted,
					startedAt: abTestData.startedAt,
					completedAt: abTestData.completedAt,
					pausedAt: abTestData.pausedAt,
					resumedAt: abTestData.resumedAt,
					endDate: abTestData.endDate,
					primaryMetric: abTestData.primaryMetric,
					completionCriteria: abTestData.completionCriteria,
					confidenceLevel: abTestData.confidenceLevel,
					rules: abTestData.rules,
					poolingPercent: abTestData.poolingPercent || 20,
					variants: finalVariants,
					winner: abTestData.winner,
				};
				cleanedSegment.abTests?.push(cleanedABTest);
			}
		}

		config.segments.push(cleanedSegment);
	}

	// Sort segments by priority (higher priority first)
	config.segments.sort((a, b) => b.priority - a.priority);

	return config;
}

/**
 * Clean individual rule for config
 */
function cleanRule(rule: SegmentRule): CleanedSegmentRule {
	return {
		id: rule.id,
		ruleType: rule.ruleType,
		operator: rule.operator,
		value: rule.value,
		isRequired: rule.isRequired,
	};
}

/**
 * Validate the config structure
 */
export function validateCampaignConfig(config: CampaignConfig): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Check if there's at least one segment or a default landing page
	if (config.segments.length === 0 && !config.defaultLandingPageId) {
		errors.push(
			"Campaign must have at least one segment or a default landing page",
		);
	}

	// Validate each segment
	for (const segment of config.segments) {
		// Check if segment has a landing page or A/B tests
		const hasLandingPage = segment.primaryLandingPageId !== undefined;
		const hasABTests = (segment.abTests?.length ?? 0) > 0;

		if (!hasLandingPage && !hasABTests) {
			errors.push(
				`Segment "${segment.title}" must have a landing page or A/B tests`,
			);
		}

		// Validate A/B test variants
		for (const abTest of segment.abTests ?? []) {
			if (abTest.variants.length < 2) {
				errors.push(`A/B test "${abTest.title}" must have at least 2 variants`);
			}

			const totalAllocation = abTest.variants.reduce(
				(sum, variant) => sum + variant.trafficAllocation,
				0,
			);
			if (Math.abs(totalAllocation - 100) > 0.01) {
				errors.push(
					`A/B test "${abTest.title}" variant allocations must sum to 100% (currently ${totalAllocation}%)`,
				);
			}
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Serialize config to JSON string for KV storage
 */
export function serializeConfig(config: CampaignConfig): string {
	return JSON.stringify(config, null, 2);
}

/**
 * Parse config from JSON string
 */
export function parseConfig(jsonString: string): CampaignConfig {
	return JSON.parse(jsonString) as CampaignConfig;
}
