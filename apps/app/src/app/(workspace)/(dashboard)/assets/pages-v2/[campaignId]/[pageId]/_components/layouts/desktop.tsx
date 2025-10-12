"use client";

import type { Id } from "@firebuzz/convex/nextjs";
import { Chatbox } from "@/components/chat-v2/chatbox/chatbox";
import { AgentNavbar } from "@/components/chat-v2/navigation/navbar";
import { PreviewTabs } from "@/components/chat-v2/preview-tabs";
import { ChatLayout } from "@/components/layouts/two-panels-agent/panels/chat-layout";
import { PreviewLayout } from "@/components/layouts/two-panels-agent/panels/preview-layout";
import { useTwoPanelsAgentLayout } from "@/hooks/ui/use-two-panels-agent-layout";

export const DesktopLayout = ({
	landingPageId,
}: {
	landingPageId: Id<"landingPages">;
	campaignId: Id<"campaigns">;
}) => {
	const { setIsLeftPanelCollapsed } = useTwoPanelsAgentLayout();

	return (
		<>
			<AgentNavbar />
			<div className="flex overflow-hidden flex-1 w-full min-h-0">
				<ChatLayout
					onCollapse={() => setIsLeftPanelCollapsed(true)}
					onExpand={() => setIsLeftPanelCollapsed(false)}
				>
					<Chatbox landingPageId={landingPageId} />
				</ChatLayout>
				<PreviewLayout>
					<PreviewTabs />
				</PreviewLayout>
			</div>
		</>
	);
};
