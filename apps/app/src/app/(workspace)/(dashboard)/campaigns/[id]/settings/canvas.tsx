"use client";
import { Background } from "@/components/canvas/background";
import { Canvas } from "@/components/canvas/canvas";
import { Controller } from "@/components/canvas/controller";
import { BaseNode } from "@/components/canvas/nodes/base-node";

// Center the initial node in the viewport
const initialNodes = [
  {
    id: "1",
    position: { x: 0, y: 0 }, // This will be updated to center on mount
    data: { label: "1" },
    type: "baseNode",
  },
];
const initialEdges = [{ id: "e1-2", source: "1", target: "2" }];

const nodeTypes = {
  baseNode: BaseNode,
};

export const CampaignCanvas = () => {
  return (
    <div className="flex flex-1 h-full">
      <Canvas
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        nodeTypes={nodeTypes}
      >
        <Background />
        <Controller />
      </Canvas>
    </div>
  );
};
