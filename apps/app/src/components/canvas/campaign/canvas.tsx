"use client";
import {
  type Connection,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeTypes,
  ReactFlow,
  type Viewport,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";

import { type Id, api, useMutation } from "@firebuzz/convex";
import { toast } from "@firebuzz/ui/lib/utils";
import "@xyflow/react/dist/style.css";
import { nanoid } from "nanoid";
import { useTheme } from "next-themes";
import { useCallback, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useAutoSave } from "../../../hooks/ui/use-auto-save";
import { Background } from "./background";
import { Controller } from "./controller/controller";
import { useCanvasController } from "./controller/provider";
import { TrafficWeightEdge } from "./edges/traffic-weight-edge";
import { SaveStatusComponent } from "./save-status";

// Add this at the top of your file or in a global.d.ts file
declare global {
  interface Window {
    mouseX: number;
    mouseY: number;
  }
}

// Custom styles for React Flow Canvas
const customSelectionStyles = {
  "--xy-selection-background-color": "hsla(var(--brand) / 0.1)", // Light blue background
  "--xy-selection-border-default": "2px solid hsl(var(--brand))", // Blue border
  "--xy-background-color-default": "hsl(var(--background))",
  "--xy-edge-stroke-default": "hsl(var(--primary))",
};

// Define edge types
const edgeTypes: EdgeTypes = {
  "traffic-weight": TrafficWeightEdge,
};

export const Canvas = ({
  campaignId,
  initialData,
  nodeTypes,
}: {
  campaignId: Id<"campaigns">;
  initialData: {
    nodes: Node[];
    edges: Edge[];
    viewport: Viewport;
  };
  nodeTypes: NodeTypes;
}) => {
  const { theme } = useTheme();

  const { deleteElements, addNodes, getViewport, setViewport } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);

  const { mode, isAddingNote, setIsAddingNote } = useCanvasController();

  // Mutation for saving campaign
  const updateCampaign = useMutation(
    api.collections.campaigns.mutations.update
  );

  // Function to get current canvas data
  const getCurrentCanvasData = useCallback(
    () => ({
      nodes,
      edges,
      viewport: getViewport(),
    }),
    [nodes, edges, getViewport]
  );

  // Auto-save hook
  const { status, hasChanges, saveNow, triggerAutoSave } = useAutoSave({
    getData: getCurrentCanvasData,
    onSave: async (data: {
      nodes: Node[];
      edges: Edge[];
      viewport: Viewport;
    }) => {
      try {
        await updateCampaign({
          id: campaignId,
          config: data,
        });
      } catch (error) {
        console.error("❌ Auto-save failed:", error);
        toast.error("Auto-save failed", {
          id: "canvas-auto-save-error",
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    delay: 5000, // 5 seconds
    enabled: true,
  });

  // Wrapped handlers to trigger auto-save and capture history
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);

      if (changes.filter((c) => c.type !== "select").length > 0) {
        triggerAutoSave();
      }
    },
    [triggerAutoSave, onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      onEdgesChange(changes);
      if (changes.filter((c) => c.type !== "select").length > 0) {
        triggerAutoSave();
      }
    },
    [triggerAutoSave, onEdgesChange]
  );

  // Keyboard shortcuts
  useHotkeys(
    "s+meta",
    () => {
      saveNow();
    },
    {
      preventDefault: true,
      enabled: status !== "saving",
    }
  );

  // Show placeholder note while adding
  useEffect(() => {
    if (isAddingNote) {
      const viewport = getViewport();
      const flowElement = document.querySelector(".react-flow") as HTMLElement;
      if (!flowElement) return;

      const bounds = flowElement.getBoundingClientRect();

      const placeholderNode = {
        id: "note-placeholder",
        type: "note",
        position: {
          x: (window.mouseX - bounds.left - viewport.x) / viewport.zoom + 20,
          y: (window.mouseY - bounds.top - viewport.y) / viewport.zoom + 20,
        },
        style: { opacity: 0.5 },
        selectable: false,
        draggable: false,
        data: {
          title: "New Note",
          content: "Click to place note",
        },
      };

      setNodes((nds) => [...nds, placeholderNode]);

      return () => {
        setNodes((nds) => nds.filter((n) => n.id !== "note-placeholder"));
      };
    }
  }, [isAddingNote, setNodes, getViewport]);

  // Track mouse position when adding note
  useEffect(() => {
    if (!isAddingNote) return;

    const handleMouseMove = (event: MouseEvent) => {
      const flowElement = document.querySelector(".react-flow") as HTMLElement;
      if (!flowElement) return;

      const bounds = flowElement.getBoundingClientRect();
      const viewport = getViewport();

      const position = {
        x: (event.clientX - bounds.left - viewport.x) / viewport.zoom + 20,
        y: (event.clientY - bounds.top - viewport.y) / viewport.zoom + 20,
      };

      // Update only the placeholder node's position, not the overlay
      setNodes((nds) =>
        nds.map((node) =>
          node.id === "note-placeholder" ? { ...node, position } : node
        )
      );
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isAddingNote, getViewport, setNodes]);

  // Set initial data (nodes, edges, viewport)
  useEffect(() => {
    if (initialData) {
      setViewport(initialData.viewport);
      setNodes(initialData.nodes);
      setEdges(initialData.edges);
    }
  }, [initialData, setViewport, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      triggerAutoSave();

      const childId = params.target;
      const parentId = params.source;

      setNodes((nds) => {
        // Find the child and potential parent nodes
        const childNode = nds.find((n) => n.id === childId);
        const parentNode = nds.find((n) => n.id === parentId);

        if (!childNode || !parentNode) return nds;

        // Calculate the current absolute position of the child node
        let childAbsoluteX = childNode.position.x;
        let childAbsoluteY = childNode.position.y;

        // If the child already has a parent, add its parent's position to get the absolute position
        if (childNode.parentId) {
          let currentParentId: string | undefined = childNode.parentId;
          while (currentParentId) {
            const currentParent = nds.find((n) => n.id === currentParentId);
            if (!currentParent) break;

            childAbsoluteX += currentParent.position.x;
            childAbsoluteY += currentParent.position.y;
            currentParentId = currentParent.parentId;
          }
        }

        // Calculate what the relative position should be to maintain the same absolute position
        // when connected to the new parent
        let parentAbsoluteX = parentNode.position.x;
        let parentAbsoluteY = parentNode.position.y;

        // If the new parent has a parent, add its parent's position
        if (parentNode.parentId) {
          let currentParentId: string | undefined = parentNode.parentId;
          while (currentParentId) {
            const currentParent = nds.find((n) => n.id === currentParentId);
            if (!currentParent) break;

            parentAbsoluteX += currentParent.position.x;
            parentAbsoluteY += currentParent.position.y;
            currentParentId = currentParent.parentId;
          }
        }

        // Calculate the new relative position
        const newRelativeX = childAbsoluteX - parentAbsoluteX;
        const newRelativeY = childAbsoluteY - parentAbsoluteY;

        return nds.map((node) => {
          if (node.id === childId) {
            return {
              ...node,
              parentId,
              position: { x: newRelativeX, y: newRelativeY },
            };
          }
          return node;
        });
      });
    },
    [setEdges, setNodes, triggerAutoSave]
  );

  const onEdgesDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      triggerAutoSave();
      // Process each deleted edge
      for (const edge of edgesToDelete) {
        if (edge.target.includes("placeholder")) continue;

        const targetNodeId = edge.target;
        const sourceNodeId = edge.source;

        setNodes((nds) => {
          // 1. Get the target node that will be disconnected from its parent
          const targetNode = nds.find((n) => n.id === targetNodeId);
          const sourceNode = nds.find((n) => n.id === sourceNodeId);

          if (!targetNode || targetNode.parentId !== sourceNodeId) return nds;

          // Handle variant weight redistribution for AB Test nodes
          if (sourceNode?.type === "ab-test") {
            // Find all remaining variants connected to this AB test
            const remainingVariants = nds.filter(
              (n) => n.parentId === sourceNodeId && n.id !== targetNodeId
            );

            if (remainingVariants.length > 0) {
              // Calculate equal percentage for remaining variants
              const equalPercentage = Math.floor(
                100 / remainingVariants.length
              );
              const remainder =
                100 - equalPercentage * remainingVariants.length;

              // Update edges with new percentages
              setEdges((eds) =>
                eds.map((ed) => {
                  if (ed.source === sourceNodeId) {
                    const variantIndex = remainingVariants.findIndex(
                      (v) => v.id === ed.target
                    );
                    if (variantIndex !== -1) {
                      return {
                        ...ed,
                        data: {
                          ...ed.data,
                          trafficPercentage:
                            equalPercentage +
                            (variantIndex === 0 ? remainder : 0),
                        },
                      };
                    }
                  }
                  return ed;
                })
              );

              // Update variant nodes with new percentages
              return nds.map((node) => {
                const variantIndex = remainingVariants.findIndex(
                  (v) => v.id === node.id
                );
                if (variantIndex !== -1) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      trafficPercentage:
                        equalPercentage + (variantIndex === 0 ? remainder : 0),
                    },
                  };
                }
                if (node.id === targetNodeId) {
                  return {
                    ...node,
                    parentId: undefined,
                    position: {
                      x: node.position.x + (sourceNode?.position.x || 0),
                      y: node.position.y + (sourceNode?.position.y || 0),
                    },
                  };
                }
                return node;
              });
            }
          }

          // 2. Calculate absolute positions for the target node
          let absoluteX = targetNode.position.x;
          let absoluteY = targetNode.position.y;
          const currentNode = targetNode;
          let currentParentId: string | undefined = currentNode.parentId;

          while (currentParentId) {
            const parentNode = nds.find((n) => n.id === currentParentId);
            if (!parentNode) break;

            absoluteX += parentNode.position.x;
            absoluteY += parentNode.position.y;
            currentParentId = parentNode.parentId;
          }

          // 3. Get all descendants of the target node (recursive)
          const findAllDescendants = (nodeId: string): string[] => {
            const directChildren = nds
              .filter((n) => n.parentId === nodeId)
              .map((n) => n.id);

            const allDescendants = [...directChildren];

            for (const childId of directChildren) {
              allDescendants.push(...findAllDescendants(childId));
            }

            return allDescendants;
          };

          const descendants = findAllDescendants(targetNodeId);

          // 4. Update the target node and all its descendants
          return nds.map((node) => {
            // If this is the target node that was directly connected to the deleted edge
            if (node.id === targetNodeId) {
              return {
                ...node,
                parentId: undefined, // Remove parent reference
                position: { x: absoluteX, y: absoluteY }, // Use absolute position
              };
            }

            // For descendants, maintain their positions relative to their parents
            if (descendants.includes(node.id)) {
              return node; // Keep the same relative positions for descendants
            }

            return node;
          });
        });
      }
    },
    [setNodes, setEdges, triggerAutoSave]
  );

  // Handle node selection and cleanup
  const onNodeClick = useCallback(
    (_: React.MouseEvent, clickedNode: Node) => {
      if (isAddingNote) return;

      setNodes((nds) => {
        // Find placeholder nodes that need to be deleted
        const placeholderNodesToDelete = nds.filter(
          (n) => n.type === "placeholder" && n.id !== clickedNode.id
        );

        if (placeholderNodesToDelete.length > 0) {
          // Find edges connected to placeholder nodes
          const placeholderEdges = edges.filter((edge) =>
            placeholderNodesToDelete.some((node) => edge.target === node.id)
          );

          // Delete placeholder nodes and their edges
          deleteElements({
            nodes: placeholderNodesToDelete,
            edges: placeholderEdges,
          });

          // Return nodes with updated selection state, excluding deleted placeholders
          return nds
            .filter((n) => !placeholderNodesToDelete.some((p) => p.id === n.id))
            .map((n) => ({
              ...n,
              selected: n.id === clickedNode.id,
            }));
        }

        // If no placeholders to delete, just update selection
        return nds.map((n) => ({
          ...n,
          selected: n.id === clickedNode.id,
        }));
      });
    },
    [edges, deleteElements, setNodes, isAddingNote]
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

      setNodes((nds) => {
        // Find all placeholder nodes
        const placeholderNodes = nds.filter((n) => n.type === "placeholder");

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

          // Return remaining nodes with selection cleared
          return nds
            .filter((n) => !placeholderNodes.some((p) => p.id === n.id))
            .map((n) => ({ ...n, selected: false }));
        }

        // If no placeholders to delete, just clear selection
        return nds.map((n) => ({ ...n, selected: false }));
      });
    },
    [
      isAddingNote,
      deleteElements,
      setNodes,
      addNodes,
      setIsAddingNote,
      edges,
      getViewport,
    ]
  );

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

      // Check for variant deletion restrictions (applies regardless of A/B test status)
      const variantNodesToDelete = nodesToDelete.filter((node) => node.type === "variant");
      
      if (variantNodesToDelete.length > 0) {
        // For each AB test, check if we're violating the minimum variant rules
        const abTestIds = new Set(variantNodesToDelete.map(node => node.parentId).filter(Boolean));
        
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
            (variant) => !variantNodesToDelete.some(toDelete => toDelete.id === variant.id)
          );
          
          // Check if we're trying to delete a control variant
          const controlVariantToDelete = variantNodesToDelete.find(
            (variant) => variant.parentId === abTestId && variant.data?.isControl
          );
          
          // Prevent deletion if:
          // 1. Trying to delete control variant (unless A/B test is being deleted)
          // 2. Would leave less than 2 variants (unless A/B test is being deleted)
          if (controlVariantToDelete) {
            toast.error("Cannot delete control variant", {
              id: "delete-control-variant",
              description: "Control variants cannot be deleted. Make another variant the control first, or delete the entire A/B test.",
            });
            return {
              nodes: [], // Don't delete any nodes
              edges: [], // Don't delete any edges
            };
          }
          
          if (remainingVariants.length < 2) {
            toast.error("Minimum 2 variants required", {
              id: "delete-minimum-variants",
              description: "A/B tests require at least 2 variants. Delete the entire A/B test instead, or add more variants first.",
            });
            return {
              nodes: [], // Don't delete any nodes
              edges: [], // Don't delete any edges
            };
          }
        }
      }

      // Check for A/B test deletion restrictions based on state
      const abTestNodesToDelete = nodesToDelete.filter((node) => node.type === "ab-test");
      const segmentNodesToDelete = nodesToDelete.filter((node) => node.type === "segment");
      
      // Prevent deletion of A/B tests in protected states
      for (const abTestNode of abTestNodesToDelete) {
        const status = abTestNode.data?.status;
        if (status === "running" || status === "completed" || status === "paused") {
          const statusText = status.charAt(0).toUpperCase() + status.slice(1);
          toast.error(`Cannot delete ${statusText.toLowerCase()} A/B test`, {
            id: "delete-protected-abtest",
            description: `${statusText} A/B tests cannot be deleted. Change the test status to draft first.`,
          });
          return {
            nodes: [], // Don't delete any nodes
            edges: [], // Don't delete any edges
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
          (abTest) => !abTestNodesToDelete.some(toDelete => toDelete.id === abTest.id)
        );
        
        // Check if any remaining child A/B test is in a protected state
        const protectedAbTest = remainingAbTests.find((abTest) => {
          const status = abTest.data?.status;
          return status === "running" || status === "completed" || status === "paused";
        });
        
        if (protectedAbTest) {
          const status = protectedAbTest.data?.status as string;
          const statusText = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Active";
          toast.error("Cannot delete segment with active tests", {
            id: "delete-protected-segment",
            description: `This segment contains ${statusText.toLowerCase()} A/B tests. Delete or change the status of all A/B tests first.`,
          });
          return {
            nodes: [], // Don't delete any nodes
            edges: [], // Don't delete any edges
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
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onBeforeDelete={onBeforeDelete}
        onEdgesDelete={onEdgesDelete}
        onConnect={onConnect}
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
        selectionOnDrag={!isAddingNote && mode === "select"}
      >
        <Background />
        <Controller />
        <SaveStatusComponent status={status} hasChanges={hasChanges} />
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
                author: "Batuhan Bilgin",
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
