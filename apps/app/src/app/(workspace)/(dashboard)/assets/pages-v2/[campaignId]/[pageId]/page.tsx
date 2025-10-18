import { ChatTabsProvider } from "@/components/chat-v2/providers/chat-tabs-provider";
import { DesignModeProvider } from "@/components/chat-v2/providers/design-mode-provider";
import { LandingPageProvider } from "@/components/chat-v2/providers/landing-page-provider";
import { PreviewSizeProvider } from "@/components/chat-v2/providers/preview-size-provider";
import { PreviewTabsProvider } from "@/components/chat-v2/providers/preview-tabs-provider";
import { TwoPanelsAgentProvider } from "@/components/layouts/two-panels-agent/provider";
import { AttachmentPreviewModal } from "@/components/modals/attachment/preview-modal";
import { DocumentsSelectorModal } from "@/components/modals/documents/selector/modal";
import { RenameLandingPageModal } from "@/components/modals/landing-pages/rename/rename-modal";
import { TranslationModal } from "@/components/modals/landing-pages/translations/translation-modal";
import { AIImageModal } from "@/components/modals/media/ai-image/ai-image-modal";
import { MediaGalleryModal } from "@/components/modals/media/gallery/gallery-modal";
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
		cookieStore.get("asset-agent-left-panel-size")?.value || "35",
	);

	return (
		<LandingPageProvider landingPageId={pageId} campaignId={campaignId}>
			<AgentSessionProvider
				campaignId={campaignId}
				type="landingPage"
				landingPageId={pageId}
			>
				<SanboxProvider>
					<PreviewTabsProvider>
						<PreviewSizeProvider>
							<DesignModeProvider>
								<ChatTabsProvider>
									<div className="flex flex-col flex-1 px-2 pb-2 h-screen">
										<TwoPanelsAgentProvider
											id="asset-agent"
											leftPanelSizeFromCookie={leftPanelSize}
										>
											<div className="flex overflow-hidden flex-col w-full max-h-screen">
												<Edit landingPageId={pageId} campaignId={campaignId} />
												{/* Modals */}
												<MediaGalleryModal />
												<DocumentsSelectorModal />
												<AIImageModal />
												<AttachmentPreviewModal />
												<RenameLandingPageModal />
												<TranslationModal />
											</div>
										</TwoPanelsAgentProvider>
									</div>
								</ChatTabsProvider>
							</DesignModeProvider>
						</PreviewSizeProvider>
					</PreviewTabsProvider>
				</SanboxProvider>
			</AgentSessionProvider>
		</LandingPageProvider>
	);
}
