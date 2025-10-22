"use client";

import { useParams } from "next/navigation";
import { CanvasProvider } from "@/components/canvas/campaign/provider";
import { NewLandingPageModal } from "@/components/modals/landing-pages/landing-page-modal";
import { LandingPagePreviewModal } from "@/components/modals/landing-pages/preview/landing-page-preview-modal";
import { TranslationModal } from "@/components/modals/landing-pages/translations/translation-modal";
import { CampaignTabs } from "@/components/navigation/campaign/tabs";

export default function CampaignLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { id, pageId } = useParams<{ id: string; pageId?: string }>();

	return (
		<CanvasProvider>
			<div className="flex flex-col flex-1">
				{!pageId && <CampaignTabs id={id} />}
				<div className="flex overflow-hidden flex-1"> {children}</div>
				<NewLandingPageModal />
				<TranslationModal />
				<LandingPagePreviewModal />
			</div>
		</CanvasProvider>
	);
}
