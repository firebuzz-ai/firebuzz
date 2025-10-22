"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import { Image } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { useMediaGalleryModal } from "@/hooks/ui/use-media-gallery-modal";

export const ImageSelect = ({
	onChange,
	allowedSources,
	activeTab,
	className,
	buttonType,
}: {
	onChange: (url: string) => void;
	allowedSources?: ("gallery" | "unsplash" | "upload")[];
	activeTab?: "gallery" | "unsplash" | "upload";
	buttonType?: "icon" | "default";
	className?: string;
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
		<div
			className={cn(
				"flex gap-4 justify-center items-center p-4 h-40 rounded-md border",
				className,
			)}
		>
			<Button
				type="button"
				size={buttonType === "icon" ? "iconSm" : "sm"}
				className={buttonType === "icon" ? "size-8" : ""}
				variant="outline"
				onClick={handleGalleryClick}
			>
				<Image className="size-3" />{" "}
				{buttonType === "icon" ? "" : "Select Image"}
			</Button>
		</div>
	);
};
