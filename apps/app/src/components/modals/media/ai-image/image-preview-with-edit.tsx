import { api, useMutation, useUploadFile } from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Upload } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { parseMediaFile } from "@firebuzz/utils";
import { motion } from "motion/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { useProject } from "@/hooks/auth/use-project";
import { useAIImageModal, useBrush } from "@/hooks/ui/use-ai-image-modal";
import { useMediaGalleryModal } from "@/hooks/ui/use-media-gallery-modal";
import { MaskCanvas } from "./mask-canvas";
import { SelectedImageMenu } from "./selected-image-menu";

interface ImagePreviewWithEditProps {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	isMasking: boolean;
}

export const ImagePreviewWithEdit = ({
	canvasRef,
	isMasking,
}: ImagePreviewWithEditProps) => {
	const { selectedImage, setSelectedImage, setImages, isSelectedImagePrimary } =
		useAIImageModal();
	const { setState } = useMediaGalleryModal();
	const { size: brushSize } = useBrush();

	const { currentProject } = useProject();
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
	const uploadFile = useUploadFile(api.components.r2);
	const createMedia = useMutation(
		api.collections.storage.media.mutations.create,
	);
	const [isUploading, setIsUploading] = useState(false);
	const imageRef = useRef<HTMLImageElement>(null);
	const imageContainerRef = useRef<HTMLDivElement>(null);
	const [naturalImageSize, setNaturalImageSize] = useState({
		width: 0,
		height: 0,
	});
	const [renderedImageRect, setRenderedImageRect] = useState({
		width: 0,
		height: 0,
		top: 0,
		left: 0,
	});

	const updateImageSizes = useCallback(() => {
		const container = imageContainerRef.current;
		const img = imageRef.current;

		if (container && img && img.naturalWidth > 0 && img.naturalHeight > 0) {
			setNaturalImageSize({
				width: img.naturalWidth,
				height: img.naturalHeight,
			});

			const containerWidth = container.clientWidth;
			const containerHeight = container.clientHeight;
			const imgNaturalWidth = img.naturalWidth;
			const imgNaturalHeight = img.naturalHeight;

			const containerRatio = containerWidth / containerHeight;
			const imgRatio = imgNaturalWidth / imgNaturalHeight;

			let renderedWidth = 0;
			let renderedHeight = 0;
			let offsetX = 0;
			let offsetY = 0;

			if (imgRatio > containerRatio) {
				renderedWidth = containerWidth;
				renderedHeight = containerWidth / imgRatio;
				offsetX = 0;
				offsetY = (containerHeight - renderedHeight) / 2;
			} else {
				renderedHeight = containerHeight;
				renderedWidth = containerHeight * imgRatio;
				offsetY = 0;
				offsetX = (containerWidth - renderedWidth) / 2;
			}

			setRenderedImageRect({
				width: renderedWidth,
				height: renderedHeight,
				top: offsetY,
				left: offsetX,
			});
		} else {
			setNaturalImageSize({ width: 0, height: 0 });
			setRenderedImageRect({ width: 0, height: 0, top: 0, left: 0 });
		}
	}, []);

	useEffect(() => {
		if (!isMasking || !selectedImage) {
			setNaturalImageSize({ width: 0, height: 0 });
			setRenderedImageRect({ width: 0, height: 0, top: 0, left: 0 });
			return;
		}

		updateImageSizes();
		const timer = setTimeout(updateImageSizes, 50);
		window.addEventListener("resize", updateImageSizes);

		return () => {
			clearTimeout(timer);
			window.removeEventListener("resize", updateImageSizes);
		};
	}, [isMasking, selectedImage, updateImageSizes]);

	useEffect(() => {
		const imgElement = imageRef.current;
		if (!isMasking || !imgElement) return;

		const handleLoad = () => {
			updateImageSizes();
		};

		if (!imgElement.complete) {
			imgElement.addEventListener("load", handleLoad);
		} else {
			updateImageSizes();
		}

		return () => {
			imgElement.removeEventListener("load", handleLoad);
		};
	}, [isMasking, updateImageSizes]);

	const openGalleryHandler = () => {
		setState((prev) => ({
			...prev,
			allowedTypes: ["image"],
			allowMultiple: true,
			isOpen: true,
			maxFiles: 5,
			activeTab: "gallery",
			onSelect: (data) => {
				const selectedImage = data[0];
				const images = data.map((image) => ({
					key: image.key,
					name: image.fileName,
					contentType: image.contentType,
					size: image.size,
				}));
				const selectedImageData = {
					key: selectedImage.key,
					name: selectedImage.fileName,
					contentType: selectedImage.contentType,
					size: selectedImage.size,
				};
				setSelectedImage(selectedImageData);
				setImages([...images]);
			},
		}));
	};

	const onDrop = async (acceptedFiles: File[]) => {
		if (!currentProject) {
			toast.error("No project context");
			return;
		}
		const file = acceptedFiles[0];
		if (!file) return;
		if (file.size > 50 * 1024 * 1024) {
			toast.error("File exceeds 50MB size limit.");
			return;
		}
		setIsUploading(true);
		try {
			const key = await uploadFile(file);
			const { type, contentType } = parseMediaFile(file);
			await createMedia({
				key,
				name: file.name,
				type,
				contentType,
				size: file.size,
				source: "uploaded",
			});
			setSelectedImage({
				key,
				name: file.name,
				contentType,
				size: file.size,
			});
			toast.success("Image uploaded successfully");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Upload failed");
		} finally {
			setIsUploading(false);
		}
	};
	const onDropRejected = (_fileRejections: FileRejection[]) => {
		toast.error("File rejected. Please check the file type and size.");
	};
	const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
		onDrop,
		onDropRejected,
		accept: { "image/*": [".png", ".jpg", ".jpeg"] },
		maxSize: 50 * 1024 * 1024,
		maxFiles: 5,
		noClick: true,
		multiple: true,
		disabled: isUploading,
	});

	// Function to convert brush size enum to pixel value
	const getBrushSizeValue = useCallback(() => {
		switch (brushSize) {
			case "sm":
				return 32;
			case "md":
				return 64;
			case "lg":
				return 96;
			case "xl":
				return 128;
			default:
				return 64;
		}
	}, [brushSize]);

	return (
		<div className="flex flex-col flex-1 max-h-full mt-8 overflow-hidden">
			{!selectedImage && (
				<div
					className="flex flex-col items-center justify-center w-full h-full"
					{...getRootProps()}
				>
					<input {...getInputProps()} />

					{isDragActive && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xs"
						>
							<div className="flex items-center justify-center p-4 mb-4 border rounded-full bg-muted">
								<Upload className="size-8 animate-pulse" />
							</div>
							<div className="text-center">
								<p className="text-lg font-bold">Drop images here to upload</p>
								<p className="max-w-xs mt-1 text-xs">
									PNG, JPG, JPEG, WebP, GIF. 1 file, 50MB max.
								</p>
							</div>
						</motion.div>
					)}

					{!isUploading && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 10 }}
							className="relative flex flex-1 w-full p-8 rounded-lg"
						>
							<div className="absolute inset-0 bg-background bg-[linear-gradient(to_right,hsl(var(--brand)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.15)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20" />
							<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--background)/1)_0%,transparent_70%)]" />
							<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background)/1)_70%)]" />
							<div className="relative z-10 flex items-center justify-center flex-1 text-base text-center text-muted-foreground">
								<span className="max-w-xs">
									You can <Badge variant="outline">Generate</Badge> a new image
									or{" "}
									<Badge
										onClick={openGalleryHandler}
										variant="outline"
										className="cursor-pointer"
									>
										Select
									</Badge>{" "}
									from gallery or{" "}
									<Badge
										onClick={open}
										variant="outline"
										className="cursor-pointer"
									>
										Upload
									</Badge>{" "}
									images.
								</span>
							</div>
						</motion.div>
					)}

					{isUploading && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
						>
							<Spinner size="sm" />
						</motion.div>
					)}
				</div>
			)}

			{selectedImage && (
				<div className="flex flex-col flex-1 w-full max-w-5xl mx-auto">
					<div
						ref={imageContainerRef}
						className="relative flex flex-col flex-1"
					>
						{/* Image Background */}
						<div className="relative z-0 w-full h-full max-w-5xl mx-auto rounded-md bg-background-subtle" />
						<Image
							unoptimized
							fill
							src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${selectedImage.key}`}
							alt="Media content"
							className="object-contain"
							draggable={false}
							ref={imageRef}
							onLoad={updateImageSizes}
						/>
						{isMasking &&
							naturalImageSize.width > 0 &&
							isSelectedImagePrimary && (
								<div
									style={{
										position: "absolute",
										top: `${renderedImageRect.top}px`,
										left: `${renderedImageRect.left}px`,
										width: `${renderedImageRect.width}px`,
										height: `${renderedImageRect.height}px`,
										zIndex: 10,
									}}
								>
									<MaskCanvas
										selectedImageKey={selectedImage.key}
										brushSize={getBrushSizeValue()}
										canvasRef={canvasRef}
										naturalImageSize={naturalImageSize}
										canvasSize={{
											width: renderedImageRect.width,
											height: renderedImageRect.height,
										}}
									/>
								</div>
							)}
						{!isMasking && <SelectedImageMenu />}
					</div>
				</div>
			)}
		</div>
	);
};
