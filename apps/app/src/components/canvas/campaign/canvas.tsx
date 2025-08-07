"use client";
import {
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeTypes,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
} from "@xyflow/react";

import {
  type ABTestNodeData,
  type Doc,
  type Id,
  api,
  useCachedQuery,
  useMutation,
} from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { toast } from "@firebuzz/ui/lib/utils";
import "@xyflow/react/dist/style.css";
import { nanoid } from "nanoid";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { Background } from "./background";
import { Controller } from "./controller/controller";
import { useCanvasController } from "./controller/provider";
import { CriticalErrorsPanel } from "./critical-errors-panel";
import { TrafficWeightEdge } from "./edges/traffic-weight-edge";

// Add this at the top of your file or in a global.d.ts file
declare global {
  interface Window {
    mouseX: number;
    mouseY: number;
  }
}

// Custom styles for React Flow Canvas
const customSelectionStyles = {
  "--xy-selection-background-color": "hsla(var(--brand) / 0.1)",
  "--xy-selection-border-default": "2px solid hsl(var(--brand))",
  "--xy-background-color-default": "hsl(var(--background))",
  "--xy-edge-stroke-default": "hsl(var(--primary))",
};

// Define edge types
const edgeTypes: EdgeTypes = {
  "traffic-weight": TrafficWeightEdge,
};

export const Canvas = ({
  campaignId,
  nodeTypes,
  campaign,
}: {
  campaignId: Id<"campaigns">;
  nodeTypes: NodeTypes;
  campaign: Doc<"campaigns">;
}) => {
  const { theme } = useTheme();
  const { deleteElements, addNodes, getViewport } = useReactFlow();
  const { mode, isAddingNote, setIsAddingNote } = useCanvasController();

  // Get canvas data from Convex
  const canvasData = useCachedQuery(
    api.collections.campaigns.queries.getCanvasData,
    {
      campaignId,
    }
  );

  // Mutations with optimistic updates
  const updateNodes = useMutation(
    api.collections.campaigns.mutations.updateNodes
  ).withOptimisticUpdate((store, args) => {
    const canvasData = store.getQuery(
      api.collections.campaigns.queries.getCanvasData,
      { campaignId: args.campaignId }
    );
    if (canvasData) {
      const updatedNodes = applyNodeChanges(args.changes, canvasData.nodes);
      store.setQuery(
        api.collections.campaigns.queries.getCanvasData,
        { campaignId: args.campaignId },
        {
          ...canvasData,
          nodes: updatedNodes,
        }
      );
    }
  });

  const updateEdges = useMutation(
    api.collections.campaigns.mutations.updateEdges
  ).withOptimisticUpdate((store, args) => {
    const canvasData = store.getQuery(
      api.collections.campaigns.queries.getCanvasData,
      { campaignId: args.campaignId }
    );
    if (canvasData) {
      const updatedEdges = applyEdgeChanges(args.changes, canvasData.edges);
      store.setQuery(
        api.collections.campaigns.queries.getCanvasData,
        { campaignId: args.campaignId },
        {
          ...canvasData,
          edges: updatedEdges,
        }
      );
    }
  });

  const connectEdge = useMutation(
    api.collections.campaigns.mutations.connectEdge
  ).withOptimisticUpdate((store, args) => {
    const canvasData = store.getQuery(
      api.collections.campaigns.queries.getCanvasData,
      { campaignId: args.campaignId }
    );
    if (canvasData) {
      const newEdge = {
        id: `${args.connection.source}-${args.connection.target}`,
        ...args.connection,
      };
      const updatedEdges = addEdge(newEdge, canvasData.edges);
      store.setQuery(
        api.collections.campaigns.queries.getCanvasData,
        { campaignId: args.campaignId },
        {
          ...canvasData,
          edges: updatedEdges,
        }
      );
    }
  });

  // Get base nodes and edges from canvas data
  const serverNodes = canvasData?.nodes || [];
  const serverEdges = canvasData?.edges || [];

  // Local state for nodes with selection handling
  const [localNodes, setLocalNodes] = useState<Node[]>(serverNodes);
  const [localEdges, setLocalEdges] = useState<Edge[]>(serverEdges);

  // Simple approach: only update when canvasData changes (Convex query result)
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!canvasData) return;

    setLocalNodes((prev) => {
      // Merge server data with local selections
      return serverNodes.map((serverNode) => {
        const existingLocal = prev.find((n) => n.id === serverNode.id);
        return {
          ...serverNode,
          selected: existingLocal?.selected || false, // Preserve selection state
        };
      });
    });

    setLocalEdges((prev) => {
      // Merge server data with local selections
      return serverEdges.map((serverEdge) => {
        const existingLocal = prev.find((e) => e.id === serverEdge.id);
        return {
          ...serverEdge,
          selected: existingLocal?.selected || false, // Preserve selection state
        };
      });
    });
  }, [canvasData]); // Only depend on the canvasData object itself

  // Use local state for logic (keeps all nodes for useNodes() hook)
  const nodes = localNodes;
  const edges = localEdges;

  // Handlers
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Apply all changes locally first
      setLocalNodes((prev) => applyNodeChanges(changes, prev));

      // Only send non-selection changes to server
      const nonSelectionChanges = changes.filter((c) => c.type !== "select");
      if (nonSelectionChanges.length > 0) {
        updateNodes({ campaignId, changes: nonSelectionChanges });
      }
    },
    [updateNodes, campaignId]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Apply all changes locally first
      setLocalEdges((prev) => applyEdgeChanges(changes, prev));

      // Only send non-selection changes to server
      const nonSelectionChanges = changes.filter((c) => c.type !== "select");
      if (nonSelectionChanges.length > 0) {
        updateEdges({ campaignId, changes: nonSelectionChanges });
      }
    },
    [updateEdges, campaignId]
  );

  // Track mouse position when adding note
  useEffect(() => {
    if (!isAddingNote) return;

    const handleMouseMove = (event: MouseEvent) => {
      window.mouseX = event.clientX;
      window.mouseY = event.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isAddingNote]);

  const onConnect = useCallback(
    (params: Connection) => {
      connectEdge({
        campaignId,
        connection: {
          source: params.source!,
          target: params.target!,
          sourceHandle: params.sourceHandle || undefined,
          targetHandle: params.targetHandle || undefined,
        },
      });
    },
    [connectEdge, campaignId]
  );

  // Handle clicking on the pane (background)
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (isAddingNote) {
        // Get the current flow element and viewport
        const flowElement = document.querySelector(
          ".react-flow"
        ) as HTMLElement;
        if (!flowElement) return;

        const bounds = flowElement.getBoundingClientRect();
        const viewport = getViewport();

        // Calculate the exact click position
        const clickPosition = {
          x: (event.clientX - bounds.left - viewport.x) / viewport.zoom + 20,
          y: (event.clientY - bounds.top - viewport.y) / viewport.zoom + 20,
        };

        const newNode = {
          id: `note-${nanoid(8)}`,
          type: "note",
          position: clickPosition,
          data: {
            title: "Note",
            content: "Add your note here...",
          },
        };

        addNodes(newNode);
        setIsAddingNote(false);
        return;
      }

      // Find all placeholder nodes
      const placeholderNodes = nodes.filter((n) => n.type === "placeholder");

      if (placeholderNodes.length > 0) {
        // Find edges connected to placeholder nodes
        const placeholderEdges = edges.filter((edge) =>
          placeholderNodes.some((node) => edge.target === node.id)
        );

        // Delete placeholder nodes and their edges
        deleteElements({
          nodes: placeholderNodes,
          edges: placeholderEdges,
        });
      }
    },
    [
      isAddingNote,
      deleteElements,
      addNodes,
      setIsAddingNote,
      edges,
      nodes,
      getViewport,
    ]
  );

  // Simple node click handler for debugging
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    console.log("Node clicked:", node.type, node.id);
    // Don't prevent default - let React Flow handle selection
  }, []);

  // Prevent deletion of traffic nodes and handle cleanup
  const onBeforeDelete = useCallback(
    async ({
      nodes: nodesToDelete,
      edges: edgesToDelete,
    }: {
      nodes: Node[];
      edges: Edge[];
    }) => {
      // If trying to delete a traffic node, prevent deletion of all nodes
      if (nodesToDelete.some((node) => node.type === "traffic")) {
        return {
          nodes: [], // Don't delete any nodes
          edges: [], // Don't delete any edges
        };
      }

      // Check for variant deletion restrictions
      const variantNodesToDelete = nodesToDelete.filter(
        (node) => node.type === "variant"
      );

      if (variantNodesToDelete.length > 0) {
        // For each AB test, check if we're violating the minimum variant rules
        const abTestIds = [
          ...new Set(
            variantNodesToDelete.map((node) => node.parentId).filter(Boolean)
          ),
        ];

        for (const abTestId of abTestIds) {
          // Check if the parent A/B test is also being deleted
          const abTestBeingDeleted = nodesToDelete.some(
            (node) => node.type === "ab-test" && node.id === abTestId
          );

          // If the A/B test is being deleted, allow variant deletion
          if (abTestBeingDeleted) continue;

          // Get all variants for this AB test
          const allVariantsForTest = nodes.filter(
            (node) => node.type === "variant" && node.parentId === abTestId
          );

          // Get variants that will remain after deletion
          const remainingVariants = allVariantsForTest.filter(
            (variant) =>
              !variantNodesToDelete.some(
                (toDelete) => toDelete.id === variant.id
              )
          );

          // Check if we're trying to delete a control variant
          const controlVariantToDelete = variantNodesToDelete.find(
            (variant) =>
              variant.parentId === abTestId && variant.data?.isControl
          );

          if (controlVariantToDelete) {
            toast.error("Cannot delete control variant", {
              id: "delete-control-variant",
              description:
                "Control variants cannot be deleted. Make another variant the control first, or delete the entire A/B test.",
            });
            return {
              nodes: [],
              edges: [],
            };
          }

          if (remainingVariants.length < 2) {
            toast.error("Minimum 2 variants required", {
              id: "delete-minimum-variants",
              description:
                "A/B tests require at least 2 variants. Delete the entire A/B test instead, or add more variants first.",
            });
            return {
              nodes: [],
              edges: [],
            };
          }
        }
      }

      // Check for A/B test deletion restrictions based on state
      const abTestNodesToDelete = nodesToDelete.filter(
        (node) => node.type === "ab-test"
      );
      const segmentNodesToDelete = nodesToDelete.filter(
        (node) => node.type === "segment"
      );

      // Prevent deletion of A/B tests in protected states
      for (const abTestNode of abTestNodesToDelete) {
        const status = (abTestNode.data as ABTestNodeData)?.status;
        if (
          status === "running" ||
          status === "completed" ||
          status === "paused"
        ) {
          const statusText = status.charAt(0).toUpperCase() + status.slice(1);
          toast.error(`Cannot delete ${statusText.toLowerCase()} A/B test`, {
            id: "delete-protected-abtest",
            description: `${statusText} A/B tests cannot be deleted. Change the test status to draft first.`,
          });
          return {
            nodes: [],
            edges: [],
          };
        }
      }

      // Prevent deletion of segments that have A/B tests in protected states
      for (const segmentNode of segmentNodesToDelete) {
        // Check if the segment contains A/B tests that are also being deleted
        const childAbTests = nodes.filter(
          (node) => node.type === "ab-test" && node.parentId === segmentNode.id
        );

        // Filter out A/B tests that are being deleted along with the segment
        const remainingAbTests = childAbTests.filter(
          (abTest) =>
            !abTestNodesToDelete.some((toDelete) => toDelete.id === abTest.id)
        );

        // Check if any remaining child A/B test is in a protected state
        const protectedAbTest = remainingAbTests.find((abTest) => {
          const status = (abTest.data as ABTestNodeData)?.status;
          return (
            status === "running" ||
            status === "completed" ||
            status === "paused"
          );
        });

        if (protectedAbTest) {
          const status = (protectedAbTest.data as ABTestNodeData)
            ?.status as string;
          const statusText = status
            ? status.charAt(0).toUpperCase() + status.slice(1)
            : "Active";
          toast.error("Cannot delete segment with active tests", {
            id: "delete-protected-segment",
            description: `This segment contains ${statusText.toLowerCase()} A/B tests. Delete or change the status of all A/B tests first.`,
          });
          return {
            nodes: [],
            edges: [],
          };
        }
      }

      // Find all nodes and edges that should be deleted
      const edgesToRemove = [...edgesToDelete];
      const nodesToRemove = [...nodesToDelete];

      // Add placeholder nodes to deletion when their edges are being deleted
      const placeholderEdges = edgesToDelete.filter((edge) =>
        nodes.some(
          (node) => node.type === "placeholder" && node.id === edge.target
        )
      );

      if (placeholderEdges.length > 0) {
        // Find placeholder nodes connected to these edges
        const placeholderNodesToDelete = nodes.filter(
          (node) =>
            node.type === "placeholder" &&
            placeholderEdges.some((edge) => edge.target === node.id)
        );

        // Add placeholder nodes to the deletion list if not already included
        for (const node of placeholderNodesToDelete) {
          if (!nodesToRemove.some((n) => n.id === node.id)) {
            nodesToRemove.push(node);
          }
        }
      }

      // Filter out traffic nodes from final deletion list
      const deletableNodes = nodesToRemove.filter(
        (node) => node.type !== "traffic"
      );

      return {
        nodes: deletableNodes,
        edges: edgesToRemove,
      };
    },
    [nodes]
  );

  // Handle edge deletion with weight redistribution
  const onEdgesDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      // Process each deleted edge for complex logic
      for (const edge of edgesToDelete) {
        if (edge.target.includes("placeholder")) continue;

        const targetNodeId = edge.target;
        const sourceNodeId = edge.source;

        // Find target and source nodes
        const targetNode = nodes.find((n) => n.id === targetNodeId);
        const sourceNode = nodes.find((n) => n.id === sourceNodeId);

        if (!targetNode || targetNode.parentId !== sourceNodeId) continue;

        // Handle variant weight redistribution for AB Test nodes
        if (sourceNode?.type === "ab-test") {
          // Find all remaining variants connected to this AB test
          const remainingVariants = nodes.filter(
            (n) => n.parentId === sourceNodeId && n.id !== targetNodeId
          );

          if (remainingVariants.length > 0) {
            // Calculate equal percentage for remaining variants
            const equalPercentage = Math.floor(100 / remainingVariants.length);
            const remainder = 100 - equalPercentage * remainingVariants.length;

            // Need to update both edges and nodes with new percentages
            // This will be handled by the edge and node change mutations
            const edgeChanges = edges
              .filter(
                (ed) => ed.source === sourceNodeId && ed.target !== targetNodeId
              )
              .map((ed, index) => ({
                type: "replace" as const,
                id: ed.id,
                item: {
                  ...ed,
                  data: {
                    ...ed.data,
                    trafficPercentage:
                      equalPercentage + (index === 0 ? remainder : 0),
                  },
                },
              }));

            const nodeChanges = remainingVariants.map((node, index) => ({
              type: "replace" as const,
              id: node.id,
              item: {
                ...node,
                data: {
                  ...node.data,
                  trafficPercentage:
                    equalPercentage + (index === 0 ? remainder : 0),
                },
              },
            }));

            // Update edges with new percentages
            if (edgeChanges.length > 0) {
              updateEdges({ campaignId, changes: edgeChanges });
            }

            // Update nodes with new percentages and position the disconnected node
            const targetNodeChange = {
              type: "replace" as const,
              id: targetNodeId,
              item: {
                ...targetNode,
                parentId: undefined,
                position: {
                  x: targetNode.position.x + (sourceNode?.position.x || 0),
                  y: targetNode.position.y + (sourceNode?.position.y || 0),
                },
              },
            };

            updateNodes({
              campaignId,
              changes: [...nodeChanges, targetNodeChange],
            });
          }
        } else {
          // For non-AB test nodes, just update the target node position
          let absoluteX = targetNode.position.x;
          let absoluteY = targetNode.position.y;
          let currentParentId: string | undefined = targetNode.parentId;

          // Calculate absolute positions
          while (currentParentId) {
            const parentNode = nodes.find((n) => n.id === currentParentId);
            if (!parentNode) break;

            absoluteX += parentNode.position.x;
            absoluteY += parentNode.position.y;
            currentParentId = parentNode.parentId;
          }

          // Update the target node to remove parent and use absolute position
          const nodeChange = {
            type: "replace" as const,
            id: targetNodeId,
            item: {
              ...targetNode,
              parentId: undefined,
              position: { x: absoluteX, y: absoluteY },
            },
          };

          updateNodes({ campaignId, changes: [nodeChange] });
        }
      }
    },
    [nodes, edges, updateEdges, updateNodes, campaignId]
  );

  // Loading state
  if (!canvasData) {
    return (
      <div className="flex justify-center items-center w-full h-full">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        style={{
          ...customSelectionStyles,
          width: "100%",
          height: "100%",
        }}
        colorMode={theme === "dark" ? "dark" : "light"}
        nodes={nodes}
        edges={edges}
        fitViewOptions={{
          maxZoom: 1,
          padding: 0.4,
        }}
        maxZoom={3}
        fitView={true}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onBeforeDelete={onBeforeDelete}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        panOnDrag={mode === "drag"}
        nodesDraggable={!isAddingNote && mode === "select"}
        nodesConnectable={!isAddingNote}
        nodesFocusable={!isAddingNote}
        edgesFocusable={!isAddingNote}
        elementsSelectable={!isAddingNote}
        snapToGrid={true}
        snapGrid={[10, 10]}
        selectionOnDrag={mode === "select"}
        selectNodesOnDrag={mode === "select"}
      >
        <Background />
        <Controller />
        {campaign && <CriticalErrorsPanel campaign={campaign} />}
      </ReactFlow>

      {isAddingNote && (
        <div
          className="absolute inset-0 z-50 cursor-crosshair"
          onClick={(e) => {
            const flowElement = document.querySelector(
              ".react-flow"
            ) as HTMLElement;
            if (!flowElement) return;

            const bounds = flowElement.getBoundingClientRect();
            const viewport = getViewport();

            const clickPosition = {
              x: (e.clientX - bounds.left - viewport.x) / viewport.zoom + 20,
              y: (e.clientY - bounds.top - viewport.y) / viewport.zoom + 20,
            };

            const newNode = {
              id: `note-${nanoid(8)}`,
              type: "note",
              position: clickPosition,
              selected: true,
              data: {
                author: "User",
                content: "",
              },
            };

            addNodes(newNode);
            setIsAddingNote(false);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setIsAddingNote(false);
          }}
        />
      )}
    </div>
  );
};
