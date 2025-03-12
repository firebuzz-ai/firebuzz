import { ResizableHandle } from "@firebuzz/ui/components/ui/resizable";

import { useTwoPanelsLayout } from "@/hooks/ui/use-two-panels-layout";
import { ResizablePanel } from "@firebuzz/ui/components/ui/resizable";
import { cn } from "@firebuzz/ui/lib/utils";

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
          isDragging && "bg-brand ring-1 ring-brand"
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
          !isDragging && "transition-all duration-300 ease-in-out",
          isRightPanelClosing && "whitespace-nowrap"
        )}
      >
        {children}
      </ResizablePanel>
    </>
  );
};
