"use client";

import type { Id } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { ArrowRight, GripVertical } from "@firebuzz/ui/icons/lucide";
import { useNodes, useReactFlow } from "@xyflow/react";
import { Reorder } from "motion/react";
import { useMemo, useRef } from "react";
import type { FormField, PanelScreen } from "../form-types";
import type { FormNodeData } from "@/components/canvas/forms/nodes/form-node";


interface SchemaListProps {
	campaignId: Id<"campaigns">;
	formId: Id<"forms">;
	onScreenChange: (screen: PanelScreen) => void;
	onFieldSelect: (fieldId: string) => void;
}

export const SchemaList = ({
	campaignId,
	formId,
	onScreenChange,
	onFieldSelect,
}: SchemaListProps) => {
	// Canvas-only approach - modify node data through React Flow
	const nodes = useNodes();
	const { updateNodeData } = useReactFlow();
	
	const formNode = useMemo(
		() => nodes?.find((n) => n.type === "form"),
		[nodes]
	);

	const isDraggingRef = useRef(false);

	// Update React Flow state - canvas will detect and sync to server
	const updateFormData = (updatedNodeData: FormNodeData) => {
		if (!formNode) return;
		
		// Use updateNodeData like campaigns do - this triggers onNodesChange
		updateNodeData(formNode.id, updatedNodeData);
	};

	// Get current form fields from node data
	const currentFormFields = useMemo(() => {
		if (formNode) {
			const nodeData = formNode.data as unknown as FormNodeData;
			return nodeData.schema || [];
		}
		return [];
	}, [formNode]);

	const handleReorder = (newOrder: FormField[]) => {
		if (!formNode || !formId) return;
		
		// Ensure we have different order before updating
		const currentOrder = currentFormFields.map(f => f.id).join(',');
		const newOrderIds = newOrder.map(f => f.id).join(',');
		
		if (currentOrder === newOrderIds) return; // No change
		
		console.log('Reordering fields:', newOrder.map(f => f.title));
		
		const nodeData = formNode.data as unknown as FormNodeData;
		
		// Update React Flow state directly - canvas will sync to server
		updateFormData({
			...nodeData,
			schema: newOrder,
		});
	};

	const handleFieldClick = (fieldId: string) => {
		// Prevent click during drag operation
		if (isDraggingRef.current) {
			return;
		}
		onFieldSelect(fieldId);
		onScreenChange("field-settings");
	};

	const handleDragStart = () => {
		isDraggingRef.current = true;
	};

	const handleDragEnd = () => {
		// Add a small delay to prevent click event from firing immediately after drag
		setTimeout(() => {
			isDraggingRef.current = false;
		}, 100);
	};

	if (!formNode) {
		return (
			<div className="flex justify-center items-center h-32">
				<p className="text-sm text-muted-foreground">Select form node to manage fields</p>
			</div>
		);
	}

	if (currentFormFields.length === 0) {
		return (
			<div className="flex flex-col justify-center items-center h-32 rounded-lg border bg-muted">
				<p className="text-sm text-muted-foreground">No fields added yet</p>
				<Button
					size="sm"
					variant="outline"
					onClick={() => onScreenChange("input-types")}
					className="mt-2"
				>
					Add your first field
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<Reorder.Group
				axis="y"
				values={currentFormFields}
				onReorder={handleReorder}
				className="space-y-2"
			>
				{currentFormFields.map((field) => (
					<Reorder.Item
						key={field.id}
						value={field}
						id={field.id}
						className="flex justify-between items-center px-2 py-1.5 rounded-lg border cursor-pointer group hover:bg-muted/50 hover:border-muted-foreground/10"
						onClick={() => handleFieldClick(field.id)}
						onDragStart={handleDragStart}
						onDragEnd={handleDragEnd}
						whileDrag={{
							scale: 1.02,
							zIndex: 50,
							backgroundColor: "hsl(var(--muted))",
							borderColor: "hsl(var(--muted-foreground) / 0.2)",
							boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
						}}
						dragTransition={{
							bounceStiffness: 600,
							bounceDamping: 20,
						}}
					>
						<div className="flex flex-1 gap-3 items-center">
							<GripVertical className="size-3.5 transition-colors text-muted-foreground cursor-grab active:cursor-grabbing group-hover:text-foreground" />
							<div className="flex gap-2 justify-between items-center w-full">
								<div
									className="text-sm font-medium transition-colors text-foreground group-hover:text-foreground truncate max-w-[120px]"
									title={field.title}
								>
									{field.title}
								</div>
								<div className="flex flex-shrink-0 gap-2 items-center">
									<Badge
										variant="outline"
										className="text-xs capitalize transition-all duration-200 ease-out bg-muted group-hover:translate-x-1 group-hover:bg-background"
									>
										{field.inputType}
									</Badge>
									<ArrowRight className="w-0 h-0 text-muted-foreground opacity-0 transition-all duration-200 ease-out group-hover:w-3.5 group-hover:h-3.5 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-foreground" />
								</div>
							</div>
						</div>
					</Reorder.Item>
				))}
			</Reorder.Group>
		</div>
	);
};
