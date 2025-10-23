import { NewLandingPageModal } from "@/components/modals/landing-pages/landing-page-modal";
import { TranslationModal } from "@/components/modals/landing-pages/translations/translation-modal";
import { TemplatePreviewModal } from "@/components/modals/templates/template-preview-modal";
import { AssetsTopbar } from "@/components/navigation/assets/topbar";

export default function AssetsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col flex-1">
			<AssetsTopbar />
			<div className="flex flex-1 overflow-hidden">{children}</div>
			<NewLandingPageModal />
			<TranslationModal />
			<TemplatePreviewModal />
		</div>
	);
}
