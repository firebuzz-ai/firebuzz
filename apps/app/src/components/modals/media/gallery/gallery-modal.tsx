import { useMediaGalleryModal } from "@/hooks/ui/use-media-gallery-modal";
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
import { GalleryHorizontal, Layers2, Upload } from "@firebuzz/ui/icons/lucide";
import { useMemo } from "react";
import { GalleryTab } from "./gallery";
import { UnsplashTab } from "./unsplash";
import { UploadTab } from "./upload";

const TABS: TabItem[] = [
	{
		value: "gallery",
		icon: GalleryHorizontal,
		label: "Gallery",
	},
	{
		value: "unsplash",

		icon: Layers2,
		label: "Unsplash",
	},
	{
		value: "upload",
		icon: Upload,
		label: "Upload",
	},
] as const;

export const MediaGalleryModal = () => {
	const {
		isOpen,
		setIsOpen,
		allowedTypes,
		onSelect,
		allowMultiple,
		maxFiles,
		activeTab,
		setActiveTab,
	} = useMediaGalleryModal();

	const memoizedTabs = useMemo(() => {
		return TABS.filter((tab) => {
			if (tab.value === "unsplash" && !allowedTypes.includes("image")) {
				return false;
			}
			return true;
		});
	}, [allowedTypes]);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-[700px] h-[70vh] flex flex-col !gap-0 !p-0">
				<DialogHeader className="px-4 py-4 border-b">
					<DialogTitle>Select Media</DialogTitle>
					<DialogDescription>
						Choose from your gallery, upload new files, or select from Unsplash.
					</DialogDescription>
				</DialogHeader>

				<AnimatedTabs
					tabs={memoizedTabs}
					value={activeTab}
					defaultValue={"gallery" as const}
					onValueChange={(value) =>
						setActiveTab(value as "gallery" | "unsplash" | "upload")
					}
					className="px-4"
					indicatorPadding={16}
				/>

				<div className="flex flex-col flex-1 h-full overflow-hidden">
					{activeTab === "gallery" && (
						<GalleryTab
							onSelect={onSelect}
							allowedTypes={allowedTypes}
							allowMultiple={allowMultiple}
							maxFiles={maxFiles}
							setIsOpen={setIsOpen}
						/>
					)}

					{activeTab === "unsplash" && (
						<UnsplashTab
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
