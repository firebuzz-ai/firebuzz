import type { Node } from "@xyflow/react";

export type CampaignNodeTypes =
  | "traffic"
  | "ab-test"
  | "segment"
  | "advanced-targeting"
  | "variant";

export type Validation = {
  isValid: boolean;
  message: string;
};

export type BaseCampaignNodeData = {
  title: string;
  description: string;
  validations: Validation[];
};

export type TrafficNodeData = BaseCampaignNodeData & {
  defaultVariantId: string | null;
};

export type SegmentNodeData = BaseCampaignNodeData & {
  target: string | null;
  defaultVariantId: string | null;
};

export type AdvancedTargetingNodeData = BaseCampaignNodeData & {
  target: string | null;
  defaultVariantId: string | null;
};

export type ABTestNodeData = BaseCampaignNodeData & {
  variants: {
    id: string;
    title: string;
    description: string;
    weight: number;
  }[];
};

export type NoteNodeData = BaseCampaignNodeData & {
  content: string;
  author: string;
};

export type VariantNodeData = BaseCampaignNodeData & {
  variantId: string | null;
  trafficPercentage: number;
  translations: {
    id: string;
    language: string;
    title: string;
    description: string;
  }[];
};

export type CampaignNodeData = {
  title: string;
  description: string;
  nodeType: CampaignNodeTypes;
  isDeletable: boolean;
  tag: {
    label: string;
    icon?: string;
  };
  badge?: {
    label: string;
    icon: string;
  };
};

export type PlaceholderNodeData = {
  label: string;
};

// Define the data structure as a Record
export type CampaignNode = Node<CampaignNodeData, "campaign">;
export type AllCampaignNodes =
  | TrafficNode
  | SegmentNode
  | AdvancedTargetingNode
  | ABTestNode
  | VariantNode;
export type TrafficNode = Node<TrafficNodeData, "traffic">;
export type SegmentNode = Node<SegmentNodeData, "segment">;
export type AdvancedTargetingNode = Node<
  AdvancedTargetingNodeData,
  "advanced-targeting"
>;
export type ABTestNode = Node<ABTestNodeData, "ab-test">;
export type VariantNode = Node<VariantNodeData, "variant">;
export type PlaceholderNode = Node<PlaceholderNodeData, "placeholder">;
export type NoteNode = Node<NoteNodeData, "note">;
