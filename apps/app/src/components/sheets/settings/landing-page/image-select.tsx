"use client";

import { useMediaGalleryModal } from "@/hooks/ui/use-media-gallery-modal";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Image } from "@firebuzz/ui/icons/lucide";

export const ImageSelect = ({
	onChange,
	allowedSources,
	activeTab,
}: {
	onChange: (url: string) => void;
	allowedSources?: ("gallery" | "unsplash" | "upload")[];
	activeTab?: "gallery" | "unsplash" | "upload";
}) => {
	const { setState } = useMediaGalleryModal();

	const handleGalleryClick = () => {
		setState((prev) => {
			return {
				...prev,
				allowedTypes: ["image"],
				allowedSources: allowedSources ?? ["gallery", "unsplash", "upload"],
				activeTab: activeTab ?? "gallery",
				onSelect: (data) => {
					onChange(data[0].key);
				},
				maxFiles: 1,
				allowMultiple: false,
				isOpen: true,
			};
		});
	};

	return (
		<div className="flex items-center justify-center h-40 gap-4 p-4 border rounded-md">
			<Button
				type="button"
				size="sm"
				variant="outline"
				onClick={handleGalleryClick}
			>
				<Image className="size-3" /> Select Image
			</Button>
		</div>
	);
};
