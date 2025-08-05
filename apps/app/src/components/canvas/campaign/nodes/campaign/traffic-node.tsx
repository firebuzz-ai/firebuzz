import { getDefaultSegmentRules } from "@/app/(workspace)/(dashboard)/campaigns/[id]/edit/_components/panel/helpers/default-rules";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { BaseNode as BaseNodeComponent } from "@firebuzz/ui/components/ui/base-node";
import { Button } from "@firebuzz/ui/components/ui/button";
import { ArrowDownRight, Plus } from "@firebuzz/ui/icons/lucide";
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
import { memo, useCallback, useEffect, useState } from "react";
import { CampaignNodeIcons } from "./icons";
import type { SegmentNode, TrafficNode as TrafficNodeType } from "./types";

// Use NodeProps with the complete node type
export const TrafficNode = memo(
	({ selected, data, id }: NodeProps<TrafficNodeType>) => {
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
			[childConnections, getNode],
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

				// Check it already has a segment node
				const allSegments = allChildren.filter(
					(child) => getNode(child.target)?.type === "segment",
				);

				const priority =
					allSegments && allSegments.length > 0 ? allSegments.length + 1 : 1;

				const newNodeId = `segment-${nanoid(8)}`;
				const newNode: SegmentNode = {
					id: newNodeId,
					type: "segment",
					position: {
						x: 0,
						y: 150,
					},
					parentId: id,
					data: {
						title: "New Segment",
						description: "Split traffic for different audiences",
						validations: [
							{
								isValid: false,
								message: "No default landing page selected",
							},
						],
						primaryLandingPageId: "",
						priority,
						rules: getDefaultSegmentRules(),
					},
				};

				// Add the new node
				addNodes(newNode);

				// Create an edge connecting the parent to the new node
				const newEdge = {
					id: `${id}-${newNodeId}-${allChildren.length + 1}`,
					source: id,
					target: newNodeId,
					animated: false,
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
						},
					})),
				);
			},
			[id, addNodes, addEdges, getAllChildren, setNodes, getNode],
		);

		const handleSelectNode = useCallback(async () => {
			setNodes((nodes) =>
				nodes.map((node) => ({
					...node,
					selected: node.id === id,
					data: {
						...node.data,
						isHovered: false, // Clear external hover state for all nodes
					},
				})),
			);

			// Check if it has a placeholder node
			const placeholderNode = getAllChildren().find((child) =>
				child.target.includes("placeholder"),
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
				className="relative z-20 rounded-tl-none w-[450px] group"
				selected={selected}
				externallyHovered={isExternallyHovered}
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
				{isAddNewButtonAvailable && isConnectableAsSource && (
					<div
						className={cn(
							"flex absolute right-0 left-0 -bottom-16 z-10 flex-col gap-2 justify-end items-center h-16 transition-all duration-300 ease-in-out",
							selected || isHovered
								? "opacity-100 translate-y-0 pointer-events-auto"
								: "opacity-0 translate-y-2 pointer-events-none",
						)}
					>
						<div className="w-px h-2 bg-brand/50" />
						<Button
							size="iconSm"
							variant="brand"
							className="rounded-full transition-transform duration-200 transform hover:scale-110"
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
							"flex gap-1 items-center px-3 rounded-b-none border-b-0 transition-all duration-200",
							selected
								? "bg-brand/90 text-brand-foreground border-brand"
								: isExternallyHovered
									? "bg-brand/20 text-brand border-brand/50"
									: "bg-muted text-muted-foreground border-border",
						)}
					>
						<ArrowDownRight className="size-3" />
						Traffic
					</Badge>
				</div>

				{/* Header */}
				<div
					className={cn(
						"flex gap-2 items-center px-3 py-2 rounded-tr-md border-b bg-background-subtle",
					)}
				>
					<div className="p-1 rounded-lg border bg-brand/10 border-brand text-brand">
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
	},
);

TrafficNode.displayName = "TrafficNode";
