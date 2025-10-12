"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { FormCanvasControllerProvider } from "./controller/provider";

export const FormCanvasProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	return (
		<ReactFlowProvider>
			<FormCanvasControllerProvider>{children}</FormCanvasControllerProvider>
		</ReactFlowProvider>
	);
};
