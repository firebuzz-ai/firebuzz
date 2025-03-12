import { Badge } from "@firebuzz/ui/components/ui/badge";
import { BaseNode as BaseNodeComponent } from "@firebuzz/ui/components/ui/base-node";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Plus } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
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
import { memo, useCallback, useMemo, useState } from "react";
import { CampaignNodeIcons } from "./icons";
import type { ABTestNode as ABTestNodeType, VariantNode } from "./types";

// Grid configuration for variant layout
const gridConfig = {
  columns: 2, // Grid columns (configurable)
  spacing: {
    horizontal: 550, // 450px (box width) + 100px (gap)
    vertical: 250, // Sufficient vertical gap between rows
  },
  initialOffset: {
    x: -275, // Center the first variant (offset by half the column spacing)
    y: 250, // Distance below parent node
  },
};

// Use NodeProps with the complete node type
export const ABTestNode = memo(
  ({ selected, data, id }: NodeProps<ABTestNodeType>) => {
    const { title, description } = data;
    const [isHovered, setIsHovered] = useState(false);
    const parentConnections = useNodeConnections({ id, handleType: "target" });
    const childConnections = useNodeConnections({ id, handleType: "source" });
    const {
      addNodes,
      addEdges,
      setNodes,
      getNode,
      getNodeConnections,
      setEdges,
    } = useReactFlow();

    const isValidSourceConnection = useCallback(
      (connection: Connection | Edge) => {
        const { target } = connection;
        const targetNode = getNode(target);

        return targetNode?.type === "variant";
      },
      [getNode]
    );

    const isValidTargetConnection = useCallback(
      (connection: Connection | Edge) => {
        const { source } = connection;
        const sourceNode = getNode(source);

        if (!sourceNode) return false;

        // Check source node type
        if (sourceNode?.type !== "traffic" && sourceNode?.type !== "segment")
          return false;

        // Check if source has other A/B tests
        const sourceChilds = getNodeConnections({
          type: "source",
          nodeId: source,
        });
        const hasOtherAbTests = sourceChilds.some(
          (child) => getNode(child.target)?.type === "ab-test"
        );

        return !hasOtherAbTests;
      },
      [getNode, getNodeConnections]
    );

    const isConnectableAsSource = useMemo(() => {
      return true;
    }, []);

    const isConnectableAsTarget = useMemo(() => {
      if (parentConnections.length > 0) return false;
      return true;
    }, [parentConnections]);

    const handleAddNode = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();

        const allChilds = childConnections.map((child) =>
          getNode(child.target)
        );

        // Calculate new node position based on grid layout
        const variantCount = allChilds.length;
        const newNodeIndex = variantCount;
        const rowIndex = Math.floor(newNodeIndex / gridConfig.columns);
        const colIndex = newNodeIndex % gridConfig.columns;

        // Calculate equal traffic percentage for all variants (including the new one)
        const equalPercentage = Math.floor(100 / (variantCount + 1));
        // Distribute any remainder to ensure total is exactly 100%
        const remainder = 100 - equalPercentage * (variantCount + 1);

        const newNodeId = nanoid(8);
        const newNode: VariantNode = {
          id: newNodeId,
          type: "variant",
          parentId: id,
          position: {
            x:
              gridConfig.initialOffset.x +
              colIndex * gridConfig.spacing.horizontal,
            y:
              gridConfig.initialOffset.y +
              rowIndex * gridConfig.spacing.vertical,
          },
          data: {
            title: "Variant",
            description: "New Variant Description",
            validations: [
              {
                isValid: false,
                message: "Variant is required",
              },
            ],
            variantId: null,
            // First variant gets any remainder to equal exactly 100%
            trafficPercentage:
              equalPercentage + (newNodeIndex === 0 ? remainder : 0),
            translations: [],
          },
        };

        // Add the new node
        addNodes(newNode);

        // Create an edge connecting the parent to the new node
        const newEdge = {
          id: `${id}-${newNodeId}-${allChilds.length + 1}`,
          source: id,
          target: newNodeId,
          type: "traffic-weight",
          animated: true,
          data: {
            trafficPercentage:
              equalPercentage + (newNodeIndex === 0 ? remainder : 0),
          },
        };

        addEdges(newEdge);

        // Reposition all existing variants and update traffic percentages
        setNodes((nodes) =>
          nodes.map((node) => {
            // Update all child variant nodes
            if (childConnections.some((child) => child.target === node.id)) {
              const nodeIndex = allChilds.findIndex(
                (child) => child?.id === node.id
              );
              if (nodeIndex !== -1) {
                const rowIdx = Math.floor(nodeIndex / gridConfig.columns);
                const colIdx = nodeIndex % gridConfig.columns;

                // Update the edge data with the new traffic percentage
                setEdges((edges: Edge[]) =>
                  edges.map((edge: Edge) => {
                    if (edge.target === node.id && edge.source === id) {
                      return {
                        ...edge,
                        data: {
                          ...edge.data,
                          trafficPercentage:
                            equalPercentage + (nodeIndex === 0 ? remainder : 0),
                        },
                      };
                    }
                    return edge;
                  })
                );

                return {
                  ...node,
                  selected: false,
                  position: {
                    x:
                      gridConfig.initialOffset.x +
                      colIdx * gridConfig.spacing.horizontal,
                    y:
                      gridConfig.initialOffset.y +
                      rowIdx * gridConfig.spacing.vertical,
                  },
                  data: {
                    ...node.data,
                    // First variant gets any remainder to equal exactly 100%
                    trafficPercentage:
                      equalPercentage + (nodeIndex === 0 ? remainder : 0),
                  },
                };
              }
            }

            // Select only the new node
            return {
              ...node,
              selected: node.id === newNodeId,
            };
          })
        );
      },
      [id, addNodes, addEdges, setNodes, getNode, childConnections, setEdges]
    );

    return (
      <BaseNodeComponent
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn("relative z-20 w-[450px] group")}
        selected={selected}
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

        {/* Updated Plus Button with onClick handler */}
        {(selected || isHovered) && isConnectableAsSource && (
          <div
            className={cn(
              "absolute -bottom-16 left-0 right-0 h-16 transition-all duration-300 flex gap-2 items-center justify-end flex-col z-10"
            )}
          >
            <div className="h-2 w-px bg-brand/50" />
            <Button
              size="iconSm"
              variant="brand"
              className="rounded-full"
              onClick={handleAddNode}
            >
              <Plus className="size-3" />
            </Button>
          </div>
        )}

        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 border-b bg-background-subtle rounded-t-md"
          )}
        >
          <div className="p-1 rounded-lg bg-brand/10 border border-brand text-brand">
            {CampaignNodeIcons["ab-test"]}
          </div>
          <span className="text-lg font-medium">{title}</span>

          <div className="ml-auto">
            <Badge variant="outline">
              {childConnections.length > 0
                ? `${childConnections.length} Variants`
                : "A/B Test"}
            </Badge>
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

ABTestNode.displayName = "ABTestNode";
