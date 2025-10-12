"use client";
import {
	ResizableHandle,
	ResizablePanel,
} from "@firebuzz/ui/components/ui/resizable";
import { cn } from "@firebuzz/ui/lib/utils";
import { useThreePanelsLayout } from "@/hooks/ui/use-three-panels-layout";

export const ConsoleLayout = ({ children }: { children: React.ReactNode }) => {
	const {
		id,
		setIsDraggingVertical,
		isDraggingVertical,

		isBottomPanelOpen,
		isBottomPanelClosing,
		isBottomPanelOpening,
		bottomPanelSize,
	} = useThreePanelsLayout();

	if (!isBottomPanelOpen) {
		return null;
	}

	return (
		<>
			<ResizableHandle
				className={cn(
					"w-px bg-border hover:bg-primary/10 hover:ring-1 hover:ring-primary/10",
					(isBottomPanelClosing || isBottomPanelOpening) && "opacity-0 w-0",
					isDraggingVertical && "bg-primary/10 ring-1 ring-primary/10",
				)}
				onDragging={setIsDraggingVertical}
			/>
			<ResizablePanel
				id={`${id}-bottom-right-panel`}
				key={`${id}-bottom-right-panel`}
				order={1}
				defaultSize={bottomPanelSize}
				minSize={isBottomPanelClosing ? 0 : 10}
				className={cn(
					!isDraggingVertical && "transition-all duration-300 ease-in-out",
					isBottomPanelClosing && "whitespace-nowrap",
				)}
			>
				{children}
			</ResizablePanel>
		</>
	);
};
