import {
	ResizableHandle,
	ResizablePanel,
} from "@firebuzz/ui/components/ui/resizable";
import { cn } from "@firebuzz/ui/lib/utils";
import { useTwoPanelsLayout } from "@/hooks/ui/use-two-panels-layout";

export const PanelLayout = ({ children }: { children: React.ReactNode }) => {
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
					"w-px bg-border hover:bg-brand hover:ring-1 hover:ring-brand",
					(isRightPanelClosing || isRightPanelOpening) && "opacity-0 w-0",
					isDragging && "bg-brand ring-1 ring-brand",
				)}
			/>
			<ResizablePanel
				id={`${id}-right-panel`}
				key={`${id}-right-panel`}
				order={1}
				defaultSize={rightPanelSize}
				maxSize={30}
				minSize={isRightPanelClosing ? 0 : 25}
				className={cn(
					"h-full flex flex-col",
					!isDragging && "transition-all duration-300 ease-in-out",
					isRightPanelClosing && "whitespace-nowrap",
				)}
			>
				<div className="flex-1 min-h-0 overflow-hidden">{children}</div>
			</ResizablePanel>
		</>
	);
};
