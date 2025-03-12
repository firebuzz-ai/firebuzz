import { useTwoPanelsLayout } from "@/hooks/ui/use-two-panels-layout";
import { ResizablePanel } from "@firebuzz/ui/components/ui/resizable";
import { cn } from "@firebuzz/ui/lib/utils";

export const ChatLayout = ({ children }: { children: React.ReactNode }) => {
  const { rightPanelSize, isDragging, id } = useTwoPanelsLayout();
  return (
    <ResizablePanel
      id={`${id}-left-panel`}
      key={`${id}-left-panel`}
      order={0}
      defaultSize={100 - rightPanelSize}
      minSize={30}
      className={cn(!isDragging && "transition-all duration-300 ease-in-out")}
    >
      {children}
    </ResizablePanel>
  );
};
