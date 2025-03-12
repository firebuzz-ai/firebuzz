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
import { memo, useCallback, useState } from "react";
import { CampaignNodeIcons } from "./icons";
import type { TrafficNode as TrafficNodeType } from "./types";

// Use NodeProps with the complete node type
export const TrafficNode = memo(
  ({ selected, data, id }: NodeProps<TrafficNodeType>) => {
    const { title, description } = data;
    const [isHovered, setIsHovered] = useState(false);
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

        if (targetNode?.type === "variant") {
          return false;
        }

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

    const isConnectableAsSource = true;
    const isAddNewButtonAvailable = true;

    const getAllChildren = useCallback(() => {
      const children = getNodeConnections({
        type: "source",
        nodeId: id,
      });
      return children;
    }, [id, getNodeConnections]);

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

        const newNodeId = `placeholder-${nanoid(8)}`;
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
        className={cn("relative z-20 w-[450px] group rounded-tl-none")}
        selected={selected}
        onClick={handleSelectNode}
      >
        {/* Add Handle */}
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-brand !border-brand !size-3 z-20"
          isConnectable={isConnectableAsSource}
          isValidConnection={isValidSourceConnection}
        />

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
        <div className="absolute -top-[22px] -left-[1px] z-10">
          <Badge
            className={cn(
              "rounded-b-none border-b-0 flex gap-1 px-3 items-center transition-all duration-0",
              selected
                ? "hover:bg-brand/90 bg-brand/90 text-brand-foreground border-brand"
                : "bg-muted hover:bg-muted text-muted-foreground border-border"
            )}
          >
            {CampaignNodeIcons["traffic-badge"]}
            Traffic
          </Badge>
        </div>

        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 border-b bg-background-subtle rounded-tr-md"
          )}
        >
          <div className="p-1 rounded-lg bg-brand/10 border border-brand text-brand">
            {CampaignNodeIcons.traffic}
          </div>
          <span className="text-lg font-medium">{title}</span>

          <div className="ml-auto">
            <Badge variant="outline">All Traffic</Badge>
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

TrafficNode.displayName = "TrafficNode";
