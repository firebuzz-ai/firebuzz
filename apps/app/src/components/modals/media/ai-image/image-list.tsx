import { envCloudflarePublic } from "@firebuzz/env";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Asterisk, ChevronRight, Plus } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { Reorder } from "motion/react";
import Image from "next/image";
import { useCallback } from "react";
import { type ImageType, useAIImageModal } from "@/hooks/ui/use-ai-image-modal";
import { useMediaGalleryModal } from "@/hooks/ui/use-media-gallery-modal";
import { checkHasHistory } from "./use-mask-state";

const ImageItem = ({
	image,
	onClick,
	isSelected,
	isPrimary,
}: {
	image: string;
	onClick: () => void;
	isSelected: boolean;
	isPrimary: boolean;
}) => {
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
	return (
		<Reorder.Item
			onClick={onClick}
			key={image}
			value={image}
			className={cn("relative  rounded-md size-8 cursor-pointer", {
				"ring-1 ring-muted-foreground": isSelected,
				"ring-1 ring-brand": isPrimary && isSelected,
			})}
		>
			{/* Icon */}
			{isPrimary && (
				<div className="absolute left-0 right-0 z-10 flex items-center justify-center -top-5">
					<Tooltip>
						<TooltipTrigger asChild>
							<Asterisk className="!size-3.5 text-brand" />
						</TooltipTrigger>
						<TooltipContent className="max-w-xs">
							<div>
								<span className="font-medium">Primary Image:</span> you can only
								mask this image. Other images are references. Reorder to set the
								primary image.
							</div>
						</TooltipContent>
					</Tooltip>
				</div>
			)}
			<Image
				unoptimized
				src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${image}`}
				alt="AI Image"
				fill
				className="object-cover rounded-md pointer-events-none select-none drag-none"
			/>
		</Reorder.Item>
	);
};

export const ImageList = ({
	selectedImageKey,
}: {
	selectedImageKey: string;
}) => {
	const {
		images,
		setImages,
		setSelectedImage,
		setState: setAIImageModalState,
	} = useAIImageModal();
	const { setState } = useMediaGalleryModal();

	const openModalHandler = () => {
		setState((prev) => {
			return {
				...prev,
				isOpen: true,
				type: "gallery",
				allowedTypes: ["image"],
				maxFiles: 5 - images.length,
				allowMultiple: 5 - images.length > 1,
				onSelect: (data) => {
					const imagesFromModal = data.map((image) => ({
						key: image.key,
						name: image.fileName,
						contentType: image.contentType,
						size: image.size,
					}));
					setImages((prev) => {
						const newImages = imagesFromModal.filter(
							(image) => !prev.includes(image),
						);
						return [...prev, ...newImages];
					});
					if (!images.some((i) => i.key === selectedImageKey)) {
						setSelectedImage(imagesFromModal[0]);
					}
				},
			};
		});
	};

	const selectImageHandler = useCallback(
		(image: ImageType) => {
			if (image.key === selectedImageKey) return;
			const isFirstImage = image.key === images[0].key;
			const hasHistory = checkHasHistory(image.key);

			if (!isFirstImage) {
				// If selecting a non-primary image, assume isMasking is false
				setAIImageModalState((prev) => ({
					...prev,
					selectedImage: image,
					isMasking: false, // Incorrect assumption
				}));
			} else {
				// If selecting the primary image, check its history
				setAIImageModalState((prev) => ({
					...prev,
					isMasking: hasHistory, // Only checks history for the primary image
					selectedImage: image,
				}));
			}
		},
		[setAIImageModalState, images, selectedImageKey],
	);

	return (
		<div className="flex items-center gap-2">
			<Reorder.Group
				axis="x"
				values={images.map((img) => img.key)}
				onReorder={(newOrderKeys) => {
					// Convert keys back to full ImageType objects
					const newOrder = newOrderKeys
						.map((key) => images.find((img) => img.key === key))
						.filter((img): img is ImageType => img !== undefined);

					const firstNewImage = newOrder[0];
					const firstCurrentImage = images[0];

					if (firstNewImage?.key && firstCurrentImage?.key && firstNewImage.key !== firstCurrentImage.key) {
						const hasHistory = checkHasHistory(firstNewImage.key);
						if (hasHistory) {
							setAIImageModalState((prev) => ({
								...prev,
								isMasking: true,
								selectedImage: firstNewImage,
							}));
						} else {
							setAIImageModalState((prev) => ({
								...prev,
								isMasking: false,
								selectedImage: firstNewImage,
							}));
						}
					}
					setImages(newOrder);
				}}
				className="flex flex-wrap gap-2"
			>
				{images.map((image, index) => (
					<ImageItem
						onClick={() => selectImageHandler(image)}
						key={image.key}
						image={image.key}
						isSelected={selectedImageKey === image.key}
						isPrimary={index === 0}
					/>
				))}
			</Reorder.Group>
			{images.length > 0 && (
				<ChevronRight className="!size-3.5 text-muted-foreground" />
			)}
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						disabled={images.length >= 5}
						variant="outline"
						size="iconSm"
						onClick={openModalHandler}
					>
						<Plus className="!size-3.5" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="flex flex-col items-start justify-start">
					<div>Add Images</div>
					<div className="text-xs text-muted-foreground">(max 5 images)</div>
				</TooltipContent>
			</Tooltip>
		</div>
	);
};
