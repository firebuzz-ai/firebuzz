import type {
  SegmentNodeData,
  TrafficNodeData,
  VariantNodeData,
  nodeSchemaConvex,
} from "@firebuzz/shared-types/campaign";
import type { Infer } from "convex/values";
import type { Id } from "../../../_generated/dataModel";

// Define the campaign node type
type CampaignNode = Infer<typeof nodeSchemaConvex>;

// Helper function to extract all landing page IDs used in campaign nodes
export const extractLandingPageIdsFromNodes = (
  nodes: CampaignNode[]
): Id<"landingPages">[] => {
  const landingPageIds = new Set<Id<"landingPages">>();

  for (const node of nodes) {
    if (!node.type || !node.data) continue;

    switch (node.type) {
      case "traffic": {
        const trafficData = node.data as TrafficNodeData;
        if (trafficData.defaultLandingPageId) {
          landingPageIds.add(trafficData.defaultLandingPageId);
        }
        break;
      }
      case "segment": {
        const segmentData = node.data as SegmentNodeData;
        if (segmentData.primaryLandingPageId) {
          landingPageIds.add(segmentData.primaryLandingPageId);
        }
        // Also extract from translations
        for (const translation of segmentData.translations) {
          landingPageIds.add(translation.landingPageId);
        }
        break;
      }
      case "variant": {
        const variantData = node.data as VariantNodeData;
        if (variantData.variantId) {
          landingPageIds.add(variantData.variantId);
        }
        break;
      }
    }
  }

  return Array.from(landingPageIds);
};
