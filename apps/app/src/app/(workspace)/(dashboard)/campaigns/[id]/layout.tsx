import { CanvasProvider } from "@/components/canvas/campaign/provider";
import { NewLandingPageModal } from "@/components/modals/landing-pages/landing-page-modal";
import { TranslationModal } from "@/components/modals/landing-pages/translations/translation-modal";
import { CampaignTabs } from "@/components/navigation/campaign/tabs";

export default async function CampaignLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	return (
		<CanvasProvider>
			<div className="flex flex-col flex-1">
				<CampaignTabs id={id} />
				<div className="flex overflow-hidden flex-1"> {children}</div>
				<NewLandingPageModal />
				<TranslationModal />
			</div>
		</CanvasProvider>
	);
}
