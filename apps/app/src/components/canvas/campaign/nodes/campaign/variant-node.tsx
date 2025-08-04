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
import { memo, useCallback, useMemo, useState, useEffect } from "react";
import { CampaignNodeIcons } from "./icons";
import type { VariantNode as VariantNodeType } from "./types";

// Use NodeProps with the complete node type
export const VariantNode = memo(
	({ selected, data, id }: NodeProps<VariantNodeType>) => {
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
						"flex items-center gap-2 px-3 py-2 border-b bg-background-subtle rounded-t-md",
					)}
				>
					<div className="p-1 rounded-lg bg-brand/10 border border-brand text-brand">
						{CampaignNodeIcons.variant}
					</div>
					<span className="text-lg font-medium">{title}</span>

					<div className="ml-auto">
						<Badge variant="outline">Variant</Badge>
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
