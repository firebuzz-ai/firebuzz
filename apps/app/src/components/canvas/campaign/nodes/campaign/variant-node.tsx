import { Badge } from "@firebuzz/ui/components/ui/badge";
import { BaseNode as BaseNodeComponent } from "@firebuzz/ui/components/ui/base-node";
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
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { VariantNode as VariantNodeType } from "./types";

// Helper functions for letter-based variant system
const getVariantLetter = (index: number) => {
	return String.fromCharCode(65 + index); // A, B, C, etc.
};

const getVariantColor = (index: number, isControl: boolean) => {
	if (isControl) {
		return "bg-blue-500 text-white"; // Blue for control (A)
	}

	const colors = [
		"bg-blue-500 text-white", // A (control) - blue
		"bg-emerald-600 text-white", // B - emerald
		"bg-purple-500 text-white", // C - purple
		"bg-orange-500 text-white", // D - orange
		"bg-pink-500 text-white", // E - pink
		"bg-indigo-500 text-white", // F - indigo
		"bg-red-500 text-white", // G - red
		"bg-teal-500 text-white", // H - teal
		"bg-yellow-500 text-black", // I - yellow (black text for contrast)
		"bg-cyan-500 text-white", // J - cyan
	];

	return colors[index] || "bg-gray-500 text-white"; // Fallback for beyond J
};

// Use NodeProps with the complete node type
export const VariantNode = memo(
	({ selected, data, id }: NodeProps<VariantNodeType>) => {
		const { title, description, variantIndex = 0, isControl = false } = data;
		const [_isHovered, setIsHovered] = useState(false);

		// Check for external hover state from panel
		const isExternallyHovered = data.isHovered || false;

		// Reset hover state when node is not selected
		useEffect(() => {
			if (!selected) {
				setIsHovered(false);
			}
		}, [selected]);
		const parentConnections = useNodeConnections({ id, handleType: "source" });

		const isValidTargetConnection = useCallback(
			(connection: Connection | Edge) => {
				const { source } = connection;
				const sourceNode = getNode(source);

				if (source === id) return false;

				return sourceNode?.type === "ab-test";
			},
			[id],
		);

		const isConnectableAsTarget = useMemo(() => {
			if (parentConnections.length > 0) return false;
			return true;
		}, [parentConnections]);

		const { getNode } = useReactFlow();

		return (
			<BaseNodeComponent
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				className="relative z-20 w-[450px] group"
				selected={selected}
				externallyHovered={isExternallyHovered}
			>
				<Handle
					type="target"
					position={Position.Top}
					className="!bg-brand !border-brand !size-3 z-20"
					isConnectable={isConnectableAsTarget}
					isValidConnection={isValidTargetConnection}
				/>

				{/* Header */}
				<div
					className={cn(
						"flex gap-2 items-center px-3 py-2 rounded-t-md border-b bg-background-subtle",
					)}
				>
					{/* Letter-based colored icon */}
					<div
						className={cn(
							"flex justify-center items-center w-6 h-6 text-xs font-bold rounded-md",
							getVariantColor(variantIndex, isControl),
						)}
					>
						{getVariantLetter(variantIndex)}
					</div>
					<span className="text-lg font-medium">{title}</span>

					<div className="ml-auto">
						{isControl ? (
							<Badge variant="outline">Control</Badge>
						) : (
							<Badge variant="outline">Variant</Badge>
						)}
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

VariantNode.displayName = "VariantNode";
