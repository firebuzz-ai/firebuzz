import { Badge } from "@firebuzz/ui/components/ui/badge";
import { BaseNode as BaseNodeComponent } from "@firebuzz/ui/components/ui/base-node";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Plus } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import {
  type Connection,
  Handle,
  type NodeProps,
  Position,
  useNodeConnections,
  useReactFlow,
} from "@xyflow/react";
import { memo, useCallback, useMemo, useState } from "react";
import { CampaignNodeIcons } from "./icons";
import type { CampaignNode as CampaignNodeType } from "./types";

// Use NodeProps with the complete node type
export const CampaignNode = memo(
  ({ selected, data, id }: NodeProps<CampaignNodeType>) => {
    const { title, description, nodeType, badge, tag } = data;
    const [isHovered, setIsHovered] = useState(false);
    const parentConnections = useNodeConnections({ id, handleType: "source" });
    const childConnections = useNodeConnections({ id, handleType: "target" });

    const isValidTargetConnection = useCallback((connection: Connection) => {
      const { source, target } = connection;
      const sourceNode = getNode(source);
      const targetNode = getNode(target);
    }, []);

    const isConnectableAsSource = useMemo(() => {
      if (nodeType === "variant") return false;
      if (nodeType === "advanced-targeting" && parentConnections.length > 0)
        return false;
      return true;
    }, [nodeType, parentConnections]);

    const isConnectableAsTarget = useMemo(() => {
      if (nodeType === "traffic") return false;
      if (childConnections.length > 0) return false;
      return true;
    }, [nodeType, childConnections]);

    const {
      addNodes,
      addEdges,
      getNodeConnections,
      setNodes,
      deleteElements,
      getNode,
    } = useReactFlow();

    const getAllChildren = useCallback(() => {
      const children = getNodeConnections({
        type: "source",
        nodeId: id,
      });
      return children;
    }, [id, getNodeConnections]);

    const isAddNewButtonAvailable = useMemo(() => {
      return nodeType !== "variant";
    }, [nodeType]);

    const handleAddNode = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        const allChildren = getAllChildren();

        // Check it already has a placeholder node
        const placeholderNode = allChildren.find(
          (child) => getNode(child.target)?.type === "placeholder"
        );

        if (placeholderNode) {
          setNodes((nodes) =>
            nodes.map((node) => ({
              ...node,
              selected: node.id === placeholderNode.target,
            }))
          );
          return;
        }

        const newNodeId = `placeholder-${id}-${allChildren.length + 1}`;
        const newNode = {
          id: newNodeId,
          type: "placeholder",
          position: {
            x: 0,
            y: 150,
          },
          parentId: id,
          data: { label: "New Node" },
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
          nodes.map((node) => ({ ...node, selected: node.id === newNodeId }))
        );
      },
      [id, addNodes, addEdges, getAllChildren, setNodes, getNode]
    );

    const handleSelectNode = useCallback(async () => {
      setNodes((nodes) =>
        nodes.map((node) => ({ ...node, selected: node.id === id }))
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
        className={cn(
          "relative z-20 w-[450px] group",
          badge && "rounded-tl-none"
        )}
        selected={selected}
        onClick={handleSelectNode}
      >
        {/* Add Handle */}
        {nodeType !== "variant" && (
          <Handle
            type="source"
            position={Position.Bottom}
            className="!bg-brand !border-brand !size-3 z-20"
            isConnectable={isConnectableAsSource}
          />
        )}

        {nodeType !== "traffic" && (
          <Handle
            type="target"
            position={Position.Top}
            className="!bg-brand !border-brand !size-3 z-20"
            isConnectable={isConnectableAsTarget}
          />
        )}

        {/* Updated Plus Button with onClick handler */}
        {isAddNewButtonAvailable &&
          (selected || isHovered) &&
          isConnectableAsSource && (
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

        {/* Badge */}
        {badge && (
          <div className="absolute -top-[22px] -left-[1px] z-10">
            <Badge
              className={cn(
                "rounded-b-none border-b-0 flex gap-1 px-3 items-center transition-all duration-0",
                selected
                  ? "hover:bg-brand/90 bg-brand/90 text-brand-foreground border-brand"
                  : "bg-muted hover:bg-muted text-muted-foreground border-border"
              )}
            >
              {CampaignNodeIcons[badge.icon as keyof typeof CampaignNodeIcons]}
              {badge.label}
            </Badge>
          </div>
        )}

        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 border-b bg-background-subtle rounded-tr-md",
            !badge && "rounded-tl-md"
          )}
        >
          <div className="p-1 rounded-lg bg-brand/10 border border-brand text-brand">
            {CampaignNodeIcons[nodeType]}
          </div>
          <span className="text-lg font-medium">{title}</span>

          <div className="ml-auto">
            <Badge variant="outline">{tag.label}</Badge>
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

CampaignNode.displayName = "CampaignNode";
