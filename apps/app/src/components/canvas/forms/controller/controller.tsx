"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipShortcut,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	Hand,
	Maximize,
	Minus,
	MousePointer,
	Plus,
	Sparkles,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import {
	Panel,
	type PanelProps,
	useKeyPress,
	useNodes,
	useReactFlow,
	useViewport,
} from "@xyflow/react";
import { useEffect, useMemo } from "react";
import type { FormField } from "../../../../app/(workspace)/(dashboard)/campaigns/[id]/form/_components/form-types";
import { AIFormGenerator } from "../../../../app/(workspace)/(dashboard)/campaigns/[id]/form/_components/preview/ai-form-generator";
import type { FormNodeData } from "../nodes/form-node";
import { useFormCanvasController } from "./provider";

type ControllerProps = Omit<PanelProps, "children"> & {};

export function Controller({ className, ...props }: ControllerProps) {
	const { zoom } = useViewport();
	const { zoomTo, zoomIn, zoomOut, fitView, updateNodeData } = useReactFlow();
	const { mode, setMode, isGeneratingSchema, setIsGeneratingSchema } =
		useFormCanvasController();

	// Canvas integration for AI generation
	const nodes = useNodes();
	const formNode = useMemo(
		() => nodes?.find((n) => n.type === "form"),
		[nodes],
	);

	// Get current schema from selected form node
	const existingSchema = useMemo(() => {
		if (formNode) {
			const nodeData = formNode.data as unknown as FormNodeData;
			return nodeData.schema || [];
		}
		return [];
	}, [formNode]);

	// Handle AI form generation
	const handleSchemaUpdate = (
		schema: FormField[],
		submitButtonText?: string,
		successMessage?: string,
	) => {
		if (formNode) {
			const nodeData = formNode.data as unknown as FormNodeData;
			updateNodeData(formNode.id, {
				...nodeData,
				schema,
				submitButtonText: submitButtonText || nodeData.submitButtonText,
				successMessage: successMessage || nodeData.successMessage,
			});
		}
		setIsGeneratingSchema(false);
	};

	// Keyboard shortcuts (same as campaign)
	const zoomOutPressed = useKeyPress(["Meta+ArrowDown", "Strg+ArrowDown"]);
	const zoomInPressed = useKeyPress(["Meta+ArrowUp", "Strg+ArrowUp"]);
	const resetZoomPressed = useKeyPress(["Meta+0", "Strg+0"]);
	const fitViewPressed = useKeyPress(["Meta+f", "Strg+f"]);

	useEffect(() => {
		if (zoomOutPressed) {
			zoomOut({ duration: 300 });
		}
		if (zoomInPressed) {
			zoomIn({ duration: 300 });
		}
		if (resetZoomPressed) {
			zoomTo(1, { duration: 300 });
		}
		if (fitViewPressed) {
			fitView({ duration: 300, maxZoom: 2 });
		}
	}, [
		zoomOutPressed,
		zoomInPressed,
		resetZoomPressed,
		fitViewPressed,
		fitView,
		zoomIn,
		zoomOut,
		zoomTo,
	]);

	return (
		<>
			<Panel
				position="bottom-center"
				className={cn(
					"flex justify-between items-stretch rounded-lg border shadow-md dark:bg-muted bg-background",
					className,
				)}
				{...props}
			>
				{/* Same controls as campaign canvas */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							className="rounded-none border-none size-8"
							onClick={() => zoomOut({ duration: 300 })}
						>
							<Minus className="size-3" />
						</Button>
					</TooltipTrigger>
					<TooltipContent sideOffset={10}>
						Zoom out <TooltipShortcut>⌘ ↓</TooltipShortcut>
					</TooltipContent>
				</Tooltip>

				<div className="w-px h-8 bg-border" />

				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							className="rounded-none border-none size-8"
							onClick={() => zoomIn({ duration: 300 })}
						>
							<Plus className="size-3" />
						</Button>
					</TooltipTrigger>
					<TooltipContent sideOffset={10}>
						Zoom in <TooltipShortcut>⌘ ↑</TooltipShortcut>
					</TooltipContent>
				</Tooltip>

				<div className="w-px h-8 bg-border" />

				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							className="h-8 tabular-nums rounded-none border-none min-w-20"
							variant="ghost"
							onClick={() => zoomTo(1, { duration: 300 })}
						>
							{(100 * zoom).toFixed(0)}%
						</Button>
					</TooltipTrigger>
					<TooltipContent sideOffset={10}>
						Reset zoom <TooltipShortcut>⌘ 0</TooltipShortcut>
					</TooltipContent>
				</Tooltip>

				<div className="w-px h-8 bg-border" />

				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							className="rounded-none border-none size-8"
							onClick={() => fitView({ duration: 300, maxZoom: 2 })}
						>
							<Maximize className="size-3" />
						</Button>
					</TooltipTrigger>
					<TooltipContent sideOffset={10}>
						Fit view <TooltipShortcut>⌘ F</TooltipShortcut>
					</TooltipContent>
				</Tooltip>

				<div className="w-px h-8 bg-border" />

				{/* Mode controls (same as campaign) */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							className={cn(
								"size-8 rounded-none border-none",
								mode === "select" && "text-brand hover:text-brand",
							)}
							onClick={() => setMode("select")}
						>
							<MousePointer className="size-3" />
						</Button>
					</TooltipTrigger>
					<TooltipContent sideOffset={10}>
						Select Mode <TooltipShortcut>V</TooltipShortcut>
					</TooltipContent>
				</Tooltip>

				<div className="w-px h-8 bg-border" />

				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							className={cn(
								"size-8 rounded-none border-none",
								mode === "drag" && "text-brand hover:text-brand",
							)}
							onClick={() => setMode("drag")}
						>
							<Hand className="size-3" />
						</Button>
					</TooltipTrigger>
					<TooltipContent sideOffset={10}>
						Drag Mode <TooltipShortcut>H</TooltipShortcut>
					</TooltipContent>
				</Tooltip>

				<div className="w-px h-8 bg-border" />

				{/* AI Generator Button */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							className={cn(
								"rounded-none border-none size-8",
								isGeneratingSchema
									? "text-brand hover:text-brand"
									: "hover:text-foreground",
							)}
							aria-pressed={isGeneratingSchema}
							onClick={() => setIsGeneratingSchema((prev) => !prev)}
						>
							<Sparkles className="size-3" />
						</Button>
					</TooltipTrigger>
					<TooltipContent sideOffset={10}>
						AI Form Generator <TooltipShortcut>⌘ G</TooltipShortcut>
					</TooltipContent>
				</Tooltip>
			</Panel>

			{/* AI Generator Integration */}
			{formNode && (
				<AIFormGenerator
					isVisible={isGeneratingSchema}
					existingSchema={existingSchema}
					onSchemaUpdate={handleSchemaUpdate}
					onClose={() => setIsGeneratingSchema(false)}
				/>
			)}
		</>
	);
}
