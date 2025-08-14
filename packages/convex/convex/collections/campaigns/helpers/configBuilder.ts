import type { Infer } from "convex/values";
import type {
  ABTestNodeData,
  SegmentNodeData,
  SegmentRule,
  TrafficNodeData,
  VariantNodeData,
} from "../nodeSchemas";
import type { edgeSchema, nodeSchema } from "../schema";

type Node = Infer<typeof nodeSchema>;
type Edge = Infer<typeof edgeSchema>;

// Types for the cleaned config structure
export interface CleanedSegmentRule {
  id: string;
  ruleType: string;
  operator: string;
  value: string | number | boolean | string[] | number[];
  label: string;
  isRequired?: boolean;
}

export interface CleanedABTestVariant {
  id: string;
  name: string;
  landingPageId?: string;
  trafficAllocation: number;
  isControl: boolean;
}

export interface CleanedSegment {
  id: string;
  title: string;
  description: string;
  priority: number;
  primaryLandingPageId?: string;
  translationMode: "disabled" | "auto-detect" | "parameter";
  translations: Array<{
    landingPageId: string;
    language: string;
  }>;
  rules: CleanedSegmentRule[];
  abTests?: CleanedABTest[];
  variants?: CleanedVariant[];
}

export interface CleanedABTest {
  id: string;
  title: string;
  description: string;
  status: "draft" | "running" | "completed" | "paused";
  poolingPercent: number;
  variants: CleanedABTestVariant[];
  winner?: string;
}

export interface CleanedVariant {
  id: string;
  title: string;
  landingPageId?: string;
  trafficPercentage: number;
  translations?: Array<{
    id: string;
    language: string;
    title: string;
  }>;
}

export interface CampaignConfig {
  defaultVariantId?: string;
  segments: CleanedSegment[];
}

/**
 * Clean React Flow nodes and edges into a config structure for CF Worker
 */
export function buildCampaignConfig(
  nodes: Node[],
  edges: Edge[]
): CampaignConfig {
  // Find the traffic node (root node)
  const trafficNode = nodes.find((node) => node.type === "traffic");
  if (!trafficNode) {
    throw new Error("No traffic node found in campaign");
  }

  const trafficData = trafficNode.data as TrafficNodeData;
  const config: CampaignConfig = {
    defaultVariantId: trafficData.defaultVariantId,
    segments: [],
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
      description: segmentData.description,
      priority: segmentData.priority,
      primaryLandingPageId: segmentData.primaryLandingPageId,
      translationMode: segmentData.translationMode || "disabled",
      translations: segmentData.translations,
      rules: segmentData.rules.map((rule) => cleanRule(rule)),
      abTests: [],
      variants: [],
    };

    // Find connections from this segment
    const segmentOutEdges = edges.filter(
      (edge) => edge.source === segmentNode.id
    );

    for (const edge of segmentOutEdges) {
      const targetNode = nodes.find((node) => node.id === edge.target);
      if (!targetNode) continue;

      if (targetNode.type === "ab-test") {
        // Process A/B test node
        const abTestData = targetNode.data as ABTestNodeData;
        const cleanedABTest: CleanedABTest = {
          id: targetNode.id,
          title: abTestData.title,
          description: abTestData.description,
          status: abTestData.status,
          poolingPercent: abTestData.poolingPercent || 20,
          variants: abTestData.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            landingPageId: variant.landingPageId,
            trafficAllocation: variant.trafficAllocation,
            isControl: variant.isControl,
          })),
          winner: abTestData.winner,
        };
        cleanedSegment.abTests?.push(cleanedABTest);
      } else if (targetNode.type === "variant") {
        // Process variant node
        const variantData = targetNode.data as VariantNodeData;
        const cleanedVariant: CleanedVariant = {
          id: targetNode.id,
          title: variantData.title,
          landingPageId: variantData.variantId,
          trafficPercentage: variantData.trafficPercentage,
        };
        cleanedSegment.variants?.push(cleanedVariant);
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
    label: rule.label,
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

  // Check if there's at least one segment or a default variant
  if (config.segments.length === 0 && !config.defaultVariantId) {
    errors.push("Campaign must have at least one segment or a default variant");
  }

  // Validate each segment
  for (const segment of config.segments) {
    // Check if segment has a landing page or variants
    const hasLandingPage = segment.primaryLandingPageId !== undefined;
    const hasVariants = (segment.variants?.length ?? 0) > 0;
    const hasABTests = (segment.abTests?.length ?? 0) > 0;

    if (!hasLandingPage && !hasVariants && !hasABTests) {
      errors.push(
        `Segment "${segment.title}" must have a landing page, variants, or A/B tests`
      );
    }

    // Validate A/B test variants
    for (const abTest of segment.abTests ?? []) {
      if (abTest.variants.length < 2) {
        errors.push(`A/B test "${abTest.title}" must have at least 2 variants`);
      }

      const totalAllocation = abTest.variants.reduce(
        (sum, variant) => sum + variant.trafficAllocation,
        0
      );
      if (Math.abs(totalAllocation - 100) > 0.01) {
        errors.push(
          `A/B test "${abTest.title}" variant allocations must sum to 100% (currently ${totalAllocation}%)`
        );
      }
    }

    // Validate variant traffic percentages if multiple variants
    if ((segment.variants?.length ?? 0) > 1) {
      const totalTraffic =
        segment.variants?.reduce(
          (sum, variant) => sum + variant.trafficPercentage,
          0
        ) ?? 0;
      if (Math.abs(totalTraffic - 100) > 0.01) {
        errors.push(
          `Segment "${segment.title}" variant traffic must sum to 100% (currently ${totalTraffic}%)`
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
