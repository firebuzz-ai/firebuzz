import { BaseNode as BaseNodeComponent } from "@firebuzz/ui/components/ui/base-node";
import type { NodeProps } from "@xyflow/react";
import { memo } from "react";

export const BaseNode = memo(({ selected }: NodeProps) => {
	return (
		<BaseNodeComponent selected={selected}>
			<div>Base Node</div>
		</BaseNodeComponent>
	);
});
