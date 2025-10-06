import { Chatbox } from "@/components/chat-v2/chatbox";
import { ChatLayout } from "@/components/layouts/three-panels/panels/asset-agent/chat-layout";
import { ConsoleLayout } from "@/components/layouts/three-panels/panels/asset-agent/console-layout";
import { PreviewLayout } from "@/components/layouts/three-panels/panels/asset-agent/preview-layout";
import { RightPanelsWrapper } from "@/components/layouts/three-panels/panels/asset-agent/right-panels-wrapper";
import { useThreePanelsLayout } from "@/hooks/ui/use-three-panels-layout";
import { Button } from "@firebuzz/ui/components/ui/button";

export const DesktopLayout = () => {
  const { closeBottomPanel, openBottomPanel } = useThreePanelsLayout();
  return (
    <div className="flex overflow-hidden flex-1 w-full min-h-0">
      <ChatLayout>
        <Chatbox />
      </ChatLayout>
      <RightPanelsWrapper>
        <PreviewLayout>
          <h1>Preview Layout</h1>
          <div className="flex gap-2">
            <Button onClick={openBottomPanel}>Open Bottom Panel</Button>
            <Button onClick={closeBottomPanel}>Close Bottom Panel</Button>
          </div>
        </PreviewLayout>
        <ConsoleLayout>
          <h1>Console Layout</h1>
        </ConsoleLayout>
      </RightPanelsWrapper>
    </div>
  );
};
