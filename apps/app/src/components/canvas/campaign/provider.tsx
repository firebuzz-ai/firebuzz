"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { CanvasControllerProvider } from "./controller/provider";

export const CanvasProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ReactFlowProvider>
      <CanvasControllerProvider>{children}</CanvasControllerProvider>
    </ReactFlowProvider>
  );
};
