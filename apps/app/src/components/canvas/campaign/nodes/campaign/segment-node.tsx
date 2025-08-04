import { Badge } from "@firebuzz/ui/components/ui/badge";
import { BaseNode as BaseNodeComponent } from "@firebuzz/ui/components/ui/base-node";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Plus } from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import {
  type Connection,
  type Edge,
  Handle,
  type NodeProps,
  Position,
  useNodeConnections,
  useReactFlow,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import { memo, useCallback, useMemo, useState, useEffect } from "react";
import { CampaignNodeIcons } from "./icons";
import type { ABTestNode, SegmentNode as SegmentNodeType } from "./types";

// Use NodeProps with the complete node type
export const SegmentNode = memo(
  ({ selected, data, id }: NodeProps<SegmentNodeType>) => {
    const { title, description } = data;
    const [isHovered, setIsHovered] = useState(false);
    
    // Check for external hover state from panel
    const isExternallyHovered = data.isHovered || false;

    // Reset hover state when node is not selected
    useEffect(() => {
      if (!selected) {
        setIsHovered(false);
      }
    }, [selected]);
    const parentConnections = useNodeConnections({ id, handleType: "target" });
    const childConnections = useNodeConnections({ id, handleType: "source" });

    const {
      addNodes,
      addEdges,
      getNodeConnections,
      setNodes,
      deleteElements,
      getNode,
    } = useReactFlow();

    const isValidSourceConnection = useCallback(
      (connection: Connection | Edge) => {
        const { target } = connection;
        const targetNode = getNode(target);

        if (
          targetNode?.type === "variant" ||
          targetNode?.type === "segment" ||
          targetNode?.type === "traffic"
        )
          return false;

        if (
          targetNode?.type === "ab-test" &&
          childConnections.some((node) => {
            const childType = getNode(node.target)?.type;
            return childType === "ab-test";
          })
        )
          return false;

        return true;
      },
      [childConnections, getNode]
    );

    const isValidTargetConnection = useCallback(
      (connection: Connection | Edge) => {
        const { source } = connection;
        const sourceNode = getNode(source);
        return sourceNode?.type === "traffic";
      },
      [getNode]
    );

    const isConnectableAsSource = useMemo(() => {
      return true;
    }, []);

    const isConnectableAsTarget = useMemo(() => {
      if (parentConnections.length > 0) return false;
      return true;
    }, [parentConnections]);

    const getAllChildren = useCallback(() => {
      const children = getNodeConnections({
        type: "source",
        nodeId: id,
      });
      return children;
    }, [id, getNodeConnections]);

    const hasExistingABTest = useMemo(() => {
      return childConnections.some((child) => {
        const childNode = getNode(child.target);
        return childNode?.type === "ab-test";
      });
    }, [childConnections, getNode]);

    const handleAddNode = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        const allChildren = getAllChildren();

        // Check if it already has an A/B test
        const existingTest = allChildren.find(
          (child) => getNode(child.target)?.type === "ab-test"
        );

        if (existingTest) {
          toast.error("You can only have one test per segment");
          return;
        }

        const newNodeId = `test-${nanoid(8)}`;
        const newNode: ABTestNode = {
          id: newNodeId,
          type: "ab-test",
          position: {
            x: 0,
            y: 150,
          },
          parentId: id,
          data: {
            title: "New Test",
            description: "New Test",
            status: "draft",
            hypothesis: "",
            isCompleted: false,
            primaryMetric: "",
            completionCriteria: {
              sampleSizePerVariant: 1000,
              testDuration: 14,
            },
            confidenceLevel: 90,
            variants: [],
            rules: {
              winningStrategy: "winner",
            },
            validations: [],
          },
        };

        // Add the new node
        addNodes(newNode);

        // Create an edge connecting the parent to the new node
        const newEdge = {
          id: `${id}-${newNodeId}-${allChildren.length + 1}`,
          source: id,
          target: newNodeId,
          animated: true,
        };

        addEdges(newEdge);

        // Unselect select current node and select the new node
        setNodes((nodes) =>
          nodes.map((node) => ({ 
            ...node, 
            selected: node.id === newNodeId,
            data: {
              ...node.data,
              isHovered: false, // Clear external hover state for all nodes
            }
          }))
        );
      },
      [id, addNodes, addEdges, getAllChildren, setNodes, getNode]
    );

    const handleSelectNode = useCallback(async () => {
      setNodes((nodes) =>
        nodes.map((node) => ({ 
          ...node, 
          selected: node.id === id,
          data: {
            ...node.data,
            isHovered: false, // Clear external hover state for all nodes
          }
        }))
      );

      // Check if it has a placeholder node
      const placeholderNode = getAllChildren().find((child) =>
        child.target.includes("placeholder")
      );

      // Delete the placeholder node
      if (placeholderNode) {
        await deleteElements({
          nodes: [{ id: placeholderNode.target }],
          edges: [{ id: placeholderNode.edgeId }],
        });
      }
    }, [id, setNodes, getAllChildren, deleteElements]);

    return (
      <BaseNodeComponent
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative z-20 w-[450px] group"
        selected={selected}
        externallyHovered={isExternallyHovered}
        onClick={handleSelectNode}
      >
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-brand !border-brand !size-3 z-20"
          isConnectable={isConnectableAsSource}
          isValidConnection={isValidSourceConnection}
        />

        <Handle
          type="target"
          position={Position.Top}
          className="!bg-brand !border-brand !size-3 z-20"
          isConnectable={isConnectableAsTarget}
          isValidConnection={isValidTargetConnection}
        />

        {/* Updated Plus Button with onClick handler - Hidden if A/B test exists */}
        {isConnectableAsSource && !hasExistingABTest && (
          <div
            className={cn(
              "flex absolute right-0 left-0 -bottom-16 z-10 flex-col gap-2 justify-end items-center h-16 transition-all duration-300 ease-in-out",
              (selected || isHovered) ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"
            )}
          >
            <div className="w-px h-2 bg-brand/50" />
            <Button
              size="iconSm"
              variant="brand"
              className="rounded-full transform transition-transform duration-200 hover:scale-110"
              onClick={handleAddNode}
            >
              <Plus className="size-3" />
            </Button>
          </div>
        )}

        {/* Header */}
        <div
          className={cn(
            "flex gap-2 items-center px-3 py-2 rounded-t-md border-b bg-background-subtle"
          )}
        >
          <div className="p-1 rounded-lg border bg-brand/10 border-brand text-brand">
            {CampaignNodeIcons.segment}
          </div>
          <span className="text-lg font-medium">{title}</span>

          <div className="ml-auto">
            <Badge variant="outline">Segment</Badge>
          </div>
        </div>

        {/* Description */}
        <div className="px-3 py-4">
          <p className="text-lg text-muted-foreground">{description}</p>
        </div>
      </BaseNodeComponent>
    );
  }
);

SegmentNode.displayName = "SegmentNode";
