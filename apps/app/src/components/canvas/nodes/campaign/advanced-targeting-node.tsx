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
import type {
  AdvancedTargetingNode as AdvancedTargetingNodeType,
  VariantNode,
} from "./types";

// Use NodeProps with the complete node type
export const AdvancedTargetingNode = memo(
  ({ selected, data, id }: NodeProps<AdvancedTargetingNodeType>) => {
    const { title, description } = data;
    const [isHovered, setIsHovered] = useState(false);
    const parentConnections = useNodeConnections({ id, handleType: "target" });
    const childConnections = useNodeConnections({ id, handleType: "source" });
    const { getNode, addNodes, addEdges } = useReactFlow();

    const isValidSourceConnection = useCallback(
      (connection: Connection | Edge) => {
        const { target } = connection;
        const targetNode = getNode(target);

        // Only allow connecting to variant nodes
        if (targetNode?.type !== "variant") return false;

        // Check if we already have a variant connected
        const hasVariant = childConnections.some((conn) => {
          const childNode = getNode(conn.target);
          return childNode?.type === "variant";
        });

        return !hasVariant;
      },
      [childConnections, getNode]
    );

    const isValidTargetConnection = useCallback(
      (connection: Connection | Edge) => {
        const { source } = connection;
        const sourceNode = getNode(source);
        return sourceNode?.type === "traffic" || sourceNode?.type === "segment";
      },
      [getNode]
    );

    const isConnectableAsSource = useMemo(() => {
      // Only allow source connection if we don't have a variant yet
      const hasVariant = childConnections.some((conn) => {
        const childNode = getNode(conn.target);
        return childNode?.type === "variant";
      });
      return !hasVariant;
    }, [childConnections, getNode]);

    const isConnectableAsTarget = useMemo(() => {
      if (parentConnections.length > 0) return false;
      return true;
    }, [parentConnections]);

    const handleAddNode = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();

        // Check if we already have a variant
        const hasVariant = childConnections.some((conn) => {
          const childNode = getNode(conn.target);
          return childNode?.type === "variant";
        });

        if (hasVariant) return;

        const newNodeId = nanoid(8);
        const newNode: VariantNode = {
          id: newNodeId,
          type: "variant",
          parentId: id,
          position: {
            x: 0,
            y: 250, // Position below the advanced targeting node
          },
          data: {
            title: "Variant",
            description: "Advanced Targeting Variant",
            validations: [
              {
                isValid: false,
                message: "Variant is required",
              },
            ],
            variantId: null,
            trafficPercentage: 100, // Single variant gets 100%
            translations: [],
          },
        };

        // Add the new node
        addNodes(newNode);

        // Create an edge connecting the parent to the new node
        const newEdge = {
          id: `${id}-${newNodeId}`,
          source: id,
          target: newNodeId,
        };

        addEdges(newEdge);
      },
      [id, addNodes, addEdges, childConnections, getNode]
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

        {/* Add Node Button */}
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
            {CampaignNodeIcons["advanced-targeting"]}
          </div>
          <span className="text-lg font-medium">{title}</span>

          <div className="ml-auto">
            <Badge variant="outline">Advanced Targeting</Badge>
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

AdvancedTargetingNode.displayName = "AdvancedTargetingNode";
