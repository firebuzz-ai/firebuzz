import {
	AnimatedTabs,
	type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { GalleryHorizontal, Upload } from "@firebuzz/ui/icons/lucide";
import { useDocumentsSelectorModal } from "@/hooks/ui/use-documents-selector-modal";
import { DocumentsTab } from "./documents";
import { UploadTab } from "./upload";

const TABS: TabItem[] = [
	{
		value: "documents",
		icon: GalleryHorizontal,
		label: "Documents",
	},
	{
		value: "upload",
		icon: Upload,
		label: "Upload",
	},
] as const;

export const DocumentsSelectorModal = () => {
	const {
		isOpen,
		setIsOpen,
		allowedTypes,
		onSelect,
		allowMultiple,
		maxFiles,
		activeTab,
		setActiveTab,
	} = useDocumentsSelectorModal();

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-[700px] h-[70vh] flex flex-col !gap-0 !p-0">
				<DialogHeader className="px-4 py-4 border-b">
					<DialogTitle>Select Documents</DialogTitle>
					<DialogDescription>
						Choose from your documents or upload new files.
					</DialogDescription>
				</DialogHeader>

				<AnimatedTabs
					tabs={TABS}
					value={activeTab}
					defaultValue={"documents" as const}
					onValueChange={(value) =>
						setActiveTab(value as "documents" | "upload")
					}
					className="px-4"
					indicatorPadding={16}
				/>

				<div className="flex flex-col flex-1 h-full overflow-hidden">
					{activeTab === "documents" && (
						<DocumentsTab
							onSelect={onSelect}
							allowedTypes={allowedTypes}
							allowMultiple={allowMultiple}
							maxFiles={maxFiles}
							setIsOpen={setIsOpen}
						/>
					)}

					{activeTab === "upload" && (
						<UploadTab
							onSelect={onSelect}
							allowedTypes={allowedTypes}
							allowMultiple={allowMultiple}
							maxFiles={maxFiles}
							setIsOpen={setIsOpen}
						/>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
};
