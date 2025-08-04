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
  isHovered?: boolean;
  validations: Validation[];
};

export type TrafficNodeData = BaseCampaignNodeData & {
  defaultVariantId: string | null;
};

export type FilterOperator = 
  | "equals" | "not_equals"
  | "greater_than" | "less_than" | "between"
  | "in" | "not_in"
  | "contains" | "not_contains"
  | "starts_with" | "ends_with";

export type RuleValueType = "string" | "number" | "boolean" | "array" | "date";

export type RuleTypeId =
  | "visitorType"
  | "country"
  | "language"
  | "deviceType"
  | "browser"
  | "operatingSystem"
  | "utmSource"
  | "utmMedium"
  | "referrer"
  | "customParameter"
  | "timeZone"
  | "hourOfDay"
  | "dayOfWeek";

export type OperatorValueTypeMapping = {
  [operator in FilterOperator]?: RuleValueType;
};

export type RuleTypeDefinition = {
  id: RuleTypeId;
  label: string;
  description: string;
  icon: React.ReactNode;
  valueType: RuleValueType; // Default value type
  supportedOperators: FilterOperator[];
  hideOperatorSelection?: boolean;
  options?: { value: string; label: string; icon?: React.ReactNode }[];
  customInputAllowed?: boolean;
  // New: Map operators to specific value types
  operatorValueTypes?: OperatorValueTypeMapping;
};

export type SegmentRule = {
  id: string;
  ruleType: RuleTypeId;
  operator: FilterOperator;
  value: string | number | boolean | string[] | number[];
  label: string;
  isRequired?: boolean;
};

export type SegmentNodeData = BaseCampaignNodeData & {
  priority: number;
  primaryLandingPageId: string;
  rules: SegmentRule[];
};

export type ABTestNodeData = BaseCampaignNodeData & {
  hypothesis: string;
  status: "draft" | "running" | "completed" | "cancelled";
  isCompleted: boolean;
  primaryMetric: string;
  completionCriteria: {
    sampleSizePerVariant?: number;
    testDuration?: number;
  };
  confidenceLevel: 90 | 95 | 99;
  variants: {
    id: string;
    isControl: boolean;
    name: string;
    landingPageId: string;
    trafficAllocation: number;
  }[];
  rules: {
    winningStrategy: "winner" | "winnerOrControl";
  };
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

// Define the data structure as a Record
export type CampaignNode = Node<CampaignNodeData, "campaign">;
export type AllCampaignNodes =
  | TrafficNode
  | SegmentNode
  | ABTestNode
  | VariantNode;
export type TrafficNode = Node<TrafficNodeData, "traffic">;
export type SegmentNode = Node<SegmentNodeData, "segment">;

export type ABTestNode = Node<ABTestNodeData, "ab-test">;
export type VariantNode = Node<VariantNodeData, "variant">;
export type NoteNode = Node<NoteNodeData, "note">;
