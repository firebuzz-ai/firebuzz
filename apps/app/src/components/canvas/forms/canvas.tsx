"use client";

import {
	api,
	type Doc,
	type Id,
	useCachedQuery,
	useMutation,
} from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	applyNodeChanges,
	type Node,
	type NodeChange,
	type NodeTypes,
	ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { Background } from "./background";
import { Controller } from "./controller/controller";
import { useFormCanvasController } from "./controller/provider";
import { FormNode } from "./nodes/form-node";

const nodeTypes: NodeTypes = {
	form: FormNode,
};

// Custom styles for React Flow Canvas (same as campaign)
const customSelectionStyles = {
	"--xy-selection-background-color": "hsla(var(--brand) / 0.1)",
	"--xy-selection-border-default": "2px solid hsl(var(--brand))",
	"--xy-background-color-default": "hsl(var(--background))",
	"--xy-edge-stroke-default": "hsl(var(--primary))",
};

export const Canvas = ({
	formId,
}: {
	formId: Id<"forms">;
	form: Doc<"forms">;
}) => {
	const { theme } = useTheme();
	const { mode } = useFormCanvasController();

	// Get canvas data from Convex (exactly like campaigns)
	const canvasData = useCachedQuery(
		api.collections.forms.queries.getFormCanvasData,
		{ formId },
	);

	// Get base nodes from canvas data
	const serverNodes = canvasData?.nodes || [];

	// Local state for nodes with selection handling (mirror campaign canvas)
	const [localNodes, setLocalNodes] = useState<Node[]>(serverNodes);

	// Keep selection locally while syncing server updates
	// biome-ignore lint/correctness/useExhaustiveDependencies: we intentionally depend only on canvasData
	useEffect(() => {
		if (!canvasData) return;

		setLocalNodes((prev) => {
			return serverNodes.map((serverNode) => {
				const existingLocal = prev.find((n) => n.id === serverNode.id);
				return {
					...serverNode,
					selected: existingLocal?.selected || false,
				} as Node;
			});
		});
	}, [canvasData]);

	// Use local state as the source of truth for the controlled ReactFlow
	const nodes = localNodes;

	// Mutations with optimistic updates (like campaigns)
	const updateNodes = useMutation(
		api.collections.forms.mutations.updateFormNodes,
	).withOptimisticUpdate((store, args) => {
		const canvasData = store.getQuery(
			api.collections.forms.queries.getFormCanvasData,
			{ formId: args.formId },
		);
		if (canvasData) {
			const updatedNodes = applyNodeChanges(args.changes, canvasData.nodes);
			store.setQuery(
				api.collections.forms.queries.getFormCanvasData,
				{ formId: args.formId },
				{
					...canvasData,
					nodes: updatedNodes,
				},
			);
		}
	});

	// Handlers (exactly like campaigns)
	const handleNodesChange = useCallback(
		(changes: NodeChange[]) => {
			// Apply all changes locally first to satisfy controlled ReactFlow
			setLocalNodes((prev) => applyNodeChanges(changes, prev));

			// Only send non-selection changes to server
			const nonSelectionChanges = changes.filter((c) => c.type !== "select");
			if (nonSelectionChanges.length > 0) {
				updateNodes({ formId, changes: nonSelectionChanges });
			}
		},
		[updateNodes, formId],
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
				edges={[]} // No edges for forms
				fitViewOptions={{
					maxZoom: 1,
					padding: 0.4,
				}}
				maxZoom={3}
				fitView={true}
				onNodesChange={handleNodesChange}
				nodeTypes={nodeTypes}
				panOnDrag={mode === "drag"}
				nodesDraggable={mode === "select"}
				nodesConnectable={false} // No connections in forms
				nodesFocusable={mode === "select"}
				elementsSelectable={mode === "select"}
				snapToGrid={true}
				snapGrid={[10, 10]}
				selectionOnDrag={mode === "select"}
				selectNodesOnDrag={mode === "select"}
			>
				<Background />
				<Controller />
			</ReactFlow>
		</div>
	);
};
