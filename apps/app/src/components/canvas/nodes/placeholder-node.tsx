import { BaseNode } from "@firebuzz/ui/components/ui/base-node";
import { Plus } from "@firebuzz/ui/icons/lucide";
import { Handle, type NodeProps, Position } from "@xyflow/react";

export const PlaceholderNode = ({ selected }: NodeProps) => {
  return (
    <BaseNode selected={selected} className="w-[450px]">
      <div className="flex items-center justify-center p-4">
        <Plus className="size-4" />
      </div>
      <Handle
        type="target"
        style={{ visibility: "hidden" }}
        position={Position.Top}
        isConnectable={false}
      />
      <Handle
        type="source"
        style={{ visibility: "hidden" }}
        position={Position.Bottom}
        isConnectable={false}
      />
    </BaseNode>
  );
};

PlaceholderNode.displayName = "PlaceholderNode";
