import { useThreePanelsLayout } from "@/hooks/ui/use-three-panels-layout";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@firebuzz/ui/components/ui/resizable";
import { cn } from "@firebuzz/ui/lib/utils";

export const RightPanelsWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const {
    id,
    setIsDraggingHorizontal,
    verticalPanelGroupRef,
    isDraggingHorizontal,
    isRightPanelClosing,
    isRightPanelOpening,
  } = useThreePanelsLayout();

  return (
    <>
      <ResizableHandle
        className={cn(
          "w-px bg-border hover:bg-primary/10 hover:ring-1 hover:ring-primary/10",
          (isRightPanelClosing || isRightPanelOpening) && "opacity-0 w-0",
          isDraggingHorizontal && "bg-primary/10 ring-1 ring-primary/10"
        )}
        onDragging={setIsDraggingHorizontal}
      />
      <ResizablePanel id={`${id}-right-panel`} defaultSize={50} minSize={20}>
        <ResizablePanelGroup
          key={`${id}-vertical-panel-group`}
          id={`${id}-vertical-panel-group`}
          ref={verticalPanelGroupRef}
          direction="vertical"
        >
          {children}
        </ResizablePanelGroup>
      </ResizablePanel>
    </>
  );
};
