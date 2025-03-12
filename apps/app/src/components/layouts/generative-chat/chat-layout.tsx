import { useGenerativeChatLayout } from "@/hooks/ui/use-generative-chat-layout";
import { ResizablePanel } from "@firebuzz/ui/components/ui/resizable";
import { cn } from "@firebuzz/ui/lib/utils";

export const ChatLayout = ({ children }: { children: React.ReactNode }) => {
  const { previewPanelSize, isDragging } = useGenerativeChatLayout();
  return (
    <ResizablePanel
      id="left-panel"
      key="left-panel"
      order={0}
      defaultSize={100 - previewPanelSize}
      minSize={30}
      className={cn(!isDragging && "transition-all duration-300 ease-in-out")}
    >
      {children}
    </ResizablePanel>
  );
};
