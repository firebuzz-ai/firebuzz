import type {
  ABTestNode,
  AdvancedTargetingNode,
  AllCampaignNodes,
  CampaignNodeTypes,
  PlaceholderNode,
  SegmentNode,
  VariantNode,
} from "@/components/canvas/nodes/campaign/types";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Split, Target, TestTube } from "@firebuzz/ui/icons/lucide";
import { useNodes, useReactFlow } from "@xyflow/react";
import { nanoid } from "nanoid";
import { useMemo } from "react";

const AllNodes: Array<{
  type: CampaignNodeTypes;
  title: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    type: "ab-test",
    title: "AB Test",
    description: "A/B test to see which version performs better",
    icon: <TestTube />,
  },
  {
    type: "advanced-targeting",
    title: "Advanced Targeting",
    description: "Advanced targeting to reach the right audience",
    icon: <Target />,
  },
  {
    type: "segment",
    title: "Segment",
    description: "Segment to split traffic for managing multiple tests",
    icon: <Split />,
  },
];

const PlaceholderNodePanel = ({ node }: { node: PlaceholderNode }) => {
  const { getNode, deleteElements, addNodes, addEdges } = useReactFlow();

  const parentNode = getNode(node.parentId ?? "");

  const AvailableNodes = useMemo(() => {
    if (!parentNode) return AllNodes;
    switch (parentNode.type) {
      case "segment":
        return AllNodes.filter((n) => n.type !== "segment");
      default:
        return AllNodes;
    }
  }, [parentNode]);

  const handleReplaceNode = (type: CampaignNodeTypes) => {
    let newNode: SegmentNode | ABTestNode | AdvancedTargetingNode;

    // Build new node object
    switch (type) {
      case "segment":
        newNode = {
          id: nanoid(8),
          type: "segment",
          position: node.position,
          selected: true,
          parentId: parentNode?.id ?? "",
          data: {
            title: AvailableNodes.find((n) => n.type === type)?.title ?? "",
            description:
              AvailableNodes.find((n) => n.type === type)?.description ?? "",
            defaultVariantId: null,
            target: null,
            validations: [
              { isValid: false, message: "Default variant not selected." },
              { isValid: false, message: "Targeting not selected." },
            ],
          },
        };
        break;
      case "ab-test":
        newNode = {
          id: nanoid(8),
          type: "ab-test",
          position: node.position,
          selected: true,
          parentId: parentNode?.id ?? "",
          data: {
            title: AvailableNodes.find((n) => n.type === type)?.title ?? "",
            description:
              AvailableNodes.find((n) => n.type === type)?.description ?? "",
            variants: [],
            validations: [
              {
                isValid: false,
                message: "No variants selected.",
              },
            ],
          },
        };
        break;
      case "advanced-targeting":
        newNode = {
          id: nanoid(8),
          type: "advanced-targeting",
          position: node.position,
          selected: true,
          parentId: parentNode?.id ?? "",
          data: {
            title: AvailableNodes.find((n) => n.type === type)?.title ?? "",
            description:
              AvailableNodes.find((n) => n.type === type)?.description ?? "",
            defaultVariantId: null,
            target: null,
            validations: [
              { isValid: false, message: "Default variant not selected." },
              { isValid: false, message: "Targeting not selected." },
            ],
          },
        };
        break;
      default:
        return;
    }

    // Delete the placeholder node
    deleteElements({ nodes: [{ id: node.id }] });

    // Add the new node
    addNodes(newNode);

    // Create an edge connecting the parent to the new node
    addEdges({
      id: `${parentNode?.id}-${newNode.id}`,
      source: parentNode?.id ?? "",
      target: newNode.id,
    });
  };

  return (
    <div className="flex flex-col gap-2 p-4">
      {AvailableNodes.map((node) => (
        <Button
          key={node.type}
          variant="outline"
          onClick={() => handleReplaceNode(node.type)}
        >
          <div>{node.icon}</div>
          <div>{node.title}</div>
        </Button>
      ))}
    </div>
  );
};

export const Panel = () => {
  const nodes = useNodes<AllCampaignNodes | PlaceholderNode>();
  const selectedNodes = useMemo(
    () => nodes.filter((node) => node.selected),
    [nodes]
  );

  const lastSelectedNode = useMemo(
    () => selectedNodes[selectedNodes.length - 1],
    [selectedNodes]
  );

  if (!lastSelectedNode) {
    return (
      <div className="flex flex-col gap-2">
        <p>No node selected</p>
        <Button>Add Node</Button>
      </div>
    );
  }

  if (lastSelectedNode?.type === "variant") {
    const node = lastSelectedNode as VariantNode;
    return <div>{node.data.trafficPercentage}</div>;
  }

  if (lastSelectedNode?.type !== "placeholder") {
    const node = lastSelectedNode as AllCampaignNodes;
    return <div>{node.data.title}</div>;
  }

  return <PlaceholderNodePanel node={lastSelectedNode as PlaceholderNode} />;
};
