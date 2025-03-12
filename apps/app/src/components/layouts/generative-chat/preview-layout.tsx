import { useGenerativeChatLayout } from "@/hooks/ui/use-generative-chat-layout";
import { ResizableHandle } from "@firebuzz/ui/components/ui/resizable";

import { ResizablePanel } from "@firebuzz/ui/components/ui/resizable";
import { cn } from "@firebuzz/ui/lib/utils";

export const PreviewLayout = ({ children }: { children: React.ReactNode }) => {
  const {
    isPreviewPanelClosing,
    isPreviewPanelOpening,
    isDragging,
    setIsDragging,
    previewPanelSize,
    isPreviewPanelOpen,
  } = useGenerativeChatLayout();

  if (!isPreviewPanelOpen) {
    return null;
  }

  return (
    <>
      <ResizableHandle
        onDragging={setIsDragging}
        className={cn(
          "w-px bg-border hover:bg-primary/10 hover:ring-1 hover:ring-primary/10",
          (isPreviewPanelClosing || isPreviewPanelOpening) && "opacity-0 w-0",
          isDragging && "bg-primary/10 ring-1 ring-primary/10"
        )}
      />
      <ResizablePanel
        id="right-panel"
        key="right-panel"
        order={1}
        defaultSize={previewPanelSize}
        maxSize={70}
        minSize={isPreviewPanelClosing ? 0 : 30}
        className={cn(
          !isDragging && "transition-all duration-300 ease-in-out",
          isPreviewPanelClosing && "whitespace-nowrap"
        )}
      >
        {children}
      </ResizablePanel>
    </>
  );
};
