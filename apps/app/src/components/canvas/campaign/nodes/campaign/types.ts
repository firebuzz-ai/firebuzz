import type {
	ABTestNodeData,
	FilterOperator,
	NoteNodeData,
	RuleTypeId,
	RuleValueType,
	SegmentNodeData,
	SegmentRule,
	TrafficNodeData,
	VariantNodeData,
} from "@firebuzz/convex";
import type { Node } from "@xyflow/react";

// Re-export all types from Convex as single source of truth
export type {
	ABTestNodeData,
	FilterOperator,
	NoteNodeData,
	RuleTypeId,
	RuleValueType,
	SegmentNodeData,
	SegmentRule,
	TrafficNodeData,
	VariantNodeData,
};

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

// Define the data structure as a Record
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
