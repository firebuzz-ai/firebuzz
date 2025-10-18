"use client";

import type { Id } from "@firebuzz/convex/nextjs";
import { Chatbox } from "@/components/chat-v2/chatbox/chatbox";
import { AgentNavbar } from "@/components/chat-v2/navigation/navbar";
import { PreviewTabs } from "@/components/chat-v2/preview/landing-page/tabs";
import { useChatTabs } from "@/components/chat-v2/providers/chat-tabs-provider";
import { VersionHistory } from "@/components/chat-v2/version-history/version-history";
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
	const { activeTab } = useChatTabs();

	return (
		<>
			<AgentNavbar />
			<div className="flex overflow-hidden flex-1 w-full min-h-0">
				<ChatLayout
					onCollapse={() => setIsLeftPanelCollapsed(true)}
					onExpand={() => setIsLeftPanelCollapsed(false)}
				>
					<div className="relative w-full h-full">
						<Chatbox landingPageId={landingPageId} />
						<div
							className="absolute inset-0 bg-background transition-opacity duration-200"
							style={{
								opacity: activeTab === "history" ? 1 : 0,
								pointerEvents: activeTab === "history" ? "auto" : "none",
							}}
						>
							<VersionHistory landingPageId={landingPageId} />
						</div>
					</div>
				</ChatLayout>
				<PreviewLayout>
					<PreviewTabs />
				</PreviewLayout>
			</div>
		</>
	);
};
