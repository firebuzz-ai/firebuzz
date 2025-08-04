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

import "@xyflow/react/dist/style.css";
import { nanoid } from "nanoid";
import { useTheme } from "next-themes";
import { useCallback, useEffect } from "react";
import { Background } from "./background";
import { Controller } from "./controller/controller";
import { useCanvasController } from "./controller/provider";
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
  initialData,
  nodeTypes,
}: {
  initialData: {
    nodes: Node[];
    edges: Edge[];
    viewport: Viewport;
  };
  nodeTypes: NodeTypes;
}) => {
  const { mode, isAddingNote, setIsAddingNote } = useCanvasController();
  const { theme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);
  const { deleteElements, addNodes, getViewport, setViewport } = useReactFlow();

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

  // Set initial viewport
  useEffect(() => {
    if (initialData.viewport) {
      setViewport(initialData.viewport);
    }
  }, [initialData.viewport, setViewport]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));

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
    [setEdges, setNodes]
  );

  const onEdgesDelete = useCallback(
    (edges: Edge[]) => {
      // Process each deleted edge
      for (const edge of edges) {
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
    [setNodes, setEdges]
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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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

/* {
  edges: [
    {
      animated: false,
      id: "initial-traffic-node-segment-PSoNs9eY",
      source: "initial-traffic-node",
      target: "segment-PSoNs9eY",
    },
    {
      animated: false,
      id: "initial-traffic-node-segment-ERwNeYDA-2",
      source: "initial-traffic-node",
      target: "segment-ERwNeYDA",
    },
  ],
  nodes: [
    {
      data: {
        defaultVariantId: null,
        description: "Start of the campaign",
        isHovered: false,
        title: "Incoming Traffic",
        validations: [
          {
            isValid: false,
            message: "No default landing page selected",
          },
        ],
      },
      dragging: false,
      id: "initial-traffic-node",
      measured: { height: 107, width: 450 },
      position: { x: -160, y: -330 },
      selected: true,
      type: "traffic",
    },
    {
      data: {
        description: "Facebook | Mobile | 25",
        isHovered: false,
        primaryLandingPageId: "",
        priority: 1,
        rules: [
          {
            id: "YojWbyH_",
            isRequired: true,
            label: "Visitor Type: All Visitors",
            operator: "equals",
            ruleType: "visitorType",
            value: "all",
          },
          {
            id: "DOUPjJ7c",
            label:
              "Country is not one of Albania, American Samoa",
            operator: "not_in",
            ruleType: "country",
            value: ["AL", "AS"],
          },
        ],
        title: "Facebook",
        validations: [
          {
            isValid: false,
            message: "No default landing page selected",
          },
        ],
      },
      dragging: false,
      id: "segment-PSoNs9eY",
      measured: { height: 107, width: 450 },
      parentId: "initial-traffic-node",
      position: { x: -230, y: 290 },
      selected: false,
      type: "segment",
    },
    {
      data: {
        description: "Instagram | Stories",
        isHovered: false,
        primaryLandingPageId: "",
        priority: 2,
        rules: [
          {
            id: "nZsvuLU8",
            isRequired: true,
            label: "Visitor Type: All Visitors",
            operator: "equals",
            ruleType: "visitorType",
            value: "all",
          },
        ],
        title: "Instagram",
        validations: [
          {
            isValid: false,
            message: "No default landing page selected",
          },
        ],
      },
      dragging: false,
      id: "segment-ERwNeYDA",
      measured: { height: 107, width: 450 },
      parentId: "initial-traffic-node",
      position: { x: 310, y: 290 },
      selected: false,
      type: "segment",
    },
  ],
  viewport: {
    x: 378.9953830759382,
    y: 465.2834843201889,
    zoom: 0.5307420431425086,
  },
} */
