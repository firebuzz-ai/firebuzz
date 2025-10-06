import { ThreePanelsProvider } from "@/components/layouts/three-panels/provider";
import { SanboxProvider } from "@/components/providers/agent/sandbox";
import { AgentSessionProvider } from "@/components/providers/agent/session";
import type { Id } from "@firebuzz/convex/nextjs";
import { cookies } from "next/headers";
import { Edit } from "./_components/edit";

export default async function Page({
	params,
}: {
	params: Promise<{ campaignId: Id<"campaigns">; pageId: Id<"landingPages"> }>;
}) {
	const { campaignId, pageId } = await params;
	const cookieStore = await cookies();

	const leftPanelSize = Number.parseFloat(
		cookieStore.get("asset-agent-left-panel-size")?.value || "50",
	);
	const rightPanelSize = Number.parseFloat(
		cookieStore.get("asset-agent-right-panel-size")?.value || "50",
	);
	const bottomPanelSize = Number.parseFloat(
		cookieStore.get("asset-agent-bottom-panel-size")?.value || "30",
	);

	return (
		<>
			<AgentSessionProvider
				campaignId={campaignId}
				type="landingPage"
				landingPageId={pageId}
			>
				<SanboxProvider>
					<ThreePanelsProvider
						id="asset-agent"
						leftPanelSizeFromCookie={leftPanelSize}
						rightPanelSizeFromCookie={rightPanelSize}
						bottomPanelSizeFromCookie={bottomPanelSize}
					>
						<div className="flex overflow-hidden flex-col w-full h-screen max-h-screen">
							{/* Header */}
							<div className="px-4 py-4 w-full border-b bg-background">
								Header
							</div>
							{/* Edit */}
							<Edit />
						</div>
					</ThreePanelsProvider>
				</SanboxProvider>
			</AgentSessionProvider>
		</>
	);
}
