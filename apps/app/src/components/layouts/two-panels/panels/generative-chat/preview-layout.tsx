import { ResizableHandle } from "@firebuzz/ui/components/ui/resizable";

import { useTwoPanelsLayout } from "@/hooks/ui/use-two-panels-layout";
import { ResizablePanel } from "@firebuzz/ui/components/ui/resizable";
import { cn } from "@firebuzz/ui/lib/utils";

export const PreviewLayout = ({ children }: { children: React.ReactNode }) => {
	const {
		isRightPanelClosing,
		isRightPanelOpening,
		isDragging,
		setIsDragging,
		rightPanelSize,
		isRightPanelOpen,
		id,
	} = useTwoPanelsLayout();

	if (!isRightPanelOpen) {
		return null;
	}

	return (
		<>
			<ResizableHandle
				onDragging={setIsDragging}
				className={cn(
					"w-px bg-border hover:bg-primary/10 hover:ring-1 hover:ring-primary/10",
					(isRightPanelClosing || isRightPanelOpening) && "opacity-0 w-0",
					isDragging && "bg-primary/10 ring-1 ring-primary/10",
				)}
			/>
			<ResizablePanel
				id={`${id}-right-panel`}
				key={`${id}-right-panel`}
				order={1}
				defaultSize={rightPanelSize}
				maxSize={70}
				minSize={isRightPanelClosing ? 0 : 30}
				className={cn(
					!isDragging && "transition-all duration-300 ease-in-out",
					isRightPanelClosing && "whitespace-nowrap",
				)}
			>
				{children}
			</ResizablePanel>
		</>
	);
};
