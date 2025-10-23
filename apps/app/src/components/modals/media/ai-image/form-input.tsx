import { useProject } from "@/hooks/auth/use-project";
import { useWorkspace } from "@/hooks/auth/use-workspace";
import { useAIImageModal } from "@/hooks/ui/use-ai-image-modal";
import { api, useAction, useStableCachedQuery } from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { GeminiIcon } from "@firebuzz/ui/icons/ai-providers";
import { CornerDownRight, Ratio } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useMemo, useState } from "react";
import { Generations } from "./generations";
import { ImageList } from "./image-list";
import { MaskButton } from "./mask-button";

const ASPECT_RATIOS = {
	"1:1": "Square",
	"16:9": "Landscape",
	"9:16": "Portrait",
	"4:3": "Classic",
	"3:4": "Classic Portrait",
	"3:2": "Photo",
	"2:3": "Photo Portrait",
} as const;

type AspectRatio = keyof typeof ASPECT_RATIOS;

const IMAGE_MODELS = {
	"nano-banana": {
		name: "Nano Banana",
		speed: "Fast",
	},
	"imagen4-fast": {
		name: "Imagen 4 Fast",
		speed: "Medium",
	},
	"imagen4-ultra": {
		name: "Imagen 4 Ultra",
		speed: "Slow",
	},
} as const;

type ImageModel = keyof typeof IMAGE_MODELS;

interface GenerateImageFormInputProps {
	selectedAspectRatio: AspectRatio;
	setSelectedAspectRatio: React.Dispatch<React.SetStateAction<AspectRatio>>;
	setState: React.Dispatch<React.SetStateAction<"idle" | "generating">>;
	quality: "low" | "medium" | "high";
	setQuality: React.Dispatch<React.SetStateAction<"low" | "medium" | "high">>;
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const GenerateImageFormInput = ({
	selectedAspectRatio,
	setSelectedAspectRatio,
	setState,
	quality,
	setQuality,
	canvasRef,
}: GenerateImageFormInputProps) => {
	const {
		selectedImage,
		setSelectedImage,
		images,
		isMasking,
		setIsMasking,
		isSelectedImagePrimary,
	} = useAIImageModal();

	const { currentWorkspace } = useWorkspace();
	const { currentProject } = useProject();

	const [prompt, setPrompt] = useState("");
	const [selectedModel, setSelectedModel] = useState<ImageModel>("nano-banana");

	const generations = useStableCachedQuery(
		api.collections.storage.media.queries.getRecentGenerations,
	);

	// Convex actions
	const generateImageAction = useAction(api.lib.fal.generateImageWithAuth);
	const editImageAction = useAction(api.lib.fal.editImageWithAuth);

	const memoizedGenerations = useMemo(() => {
		return generations?.map((generation) => ({
			imageKey: generation.key,
			name: generation.name,
			contentType: generation.contentType,
			fileSize: generation.size,
			prompt: generation.aiMetadata?.prompt ?? "",
			quality: (generation.aiMetadata?.quality ?? "medium") as
				| "low"
				| "medium"
				| "high",
			aspectRatio: (generation.aiMetadata?.size ?? "1:1") as AspectRatio,
		}));
	}, [generations]);

	// Return a Promise that resolves with the mask File or null, scaled to natural dimensions stored on canvas
	const getMaskFile = (): Promise<File | null> => {
		return new Promise((resolve) => {
			// Cast canvasRef.current to include our custom properties
			const canvas = canvasRef.current as
				| (HTMLCanvasElement & {
						naturalWidth?: number;
						naturalHeight?: number;
				  })
				| null;

			const originalWidth = canvas?.naturalWidth;
			const originalHeight = canvas?.naturalHeight;

			if (
				!canvas ||
				canvas.width === 0 ||
				canvas.height === 0 ||
				!originalWidth || // Check if natural dimensions exist
				!originalHeight ||
				originalWidth <= 0 ||
				originalHeight <= 0
			) {
				console.warn(
					"getMaskFile: Canvas not available, has zero dimensions, or missing natural dimensions.",
				);
				resolve(null);
				return;
			}

			const renderedWidth = canvas.width;
			const renderedHeight = canvas.height;

			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (!ctx) {
				console.error("getMaskFile: Failed to get 2D context.");
				resolve(null);
				return;
			}

			try {
				// 1. Get rendered ImageData
				const renderedImageData = ctx.getImageData(
					0,
					0,
					renderedWidth,
					renderedHeight,
				);
				const renderedData = renderedImageData.data;

				// 2. Create inverted ImageData at original dimensions
				const invertedImageData = new ImageData(originalWidth, originalHeight);
				const invertedData = invertedImageData.data;

				// Scaling factors
				const scaleX = renderedWidth / originalWidth;
				const scaleY = renderedHeight / originalHeight;

				// 3. Iterate through original dimensions, sample from rendered, invert
				for (let oy = 0; oy < originalHeight; oy++) {
					for (let ox = 0; ox < originalWidth; ox++) {
						const sx = Math.floor(ox * scaleX);
						const sy = Math.floor(oy * scaleY);
						const safeSx = Math.max(0, Math.min(renderedWidth - 1, sx));
						const safeSy = Math.max(0, Math.min(renderedHeight - 1, sy));
						const sourceIndex = (safeSy * renderedWidth + safeSx) * 4;
						const originalAlpha = renderedData[sourceIndex + 3];
						const targetIndex = (oy * originalWidth + ox) * 4;

						if (originalAlpha > 0) {
							invertedData[targetIndex] = 0;
							invertedData[targetIndex + 1] = 0;
							invertedData[targetIndex + 2] = 0;
							invertedData[targetIndex + 3] = 0;
						} else {
							invertedData[targetIndex] = 255;
							invertedData[targetIndex + 1] = 255;
							invertedData[targetIndex + 2] = 255;
							invertedData[targetIndex + 3] = 255;
						}
					}
				}

				// 4. Temp canvas at original dimensions
				const tempCanvas = document.createElement("canvas");
				tempCanvas.width = originalWidth;
				tempCanvas.height = originalHeight;
				const tempCtx = tempCanvas.getContext("2d");

				if (!tempCtx) {
					console.error(
						"getMaskFile: Failed to get context for temporary canvas.",
					);
					resolve(null);
					return;
				}

				// 5. Put scaled/inverted data, get blob, check size, return file
				tempCtx.putImageData(invertedImageData, 0, 0);
				tempCanvas.toBlob((blob) => {
					if (blob) {
						if (blob.size > 4 * 1024 * 1024) {
							console.warn("Generated mask blob exceeds 4MB limit.");
							toast.error("Mask image is too large (max 4MB).");
							resolve(null);
						} else {
							const file = new File([blob], "mask.png", { type: "image/png" });
							resolve(file);
						}
					} else {
						console.error(
							"getMaskFile: Failed to create blob from temporary canvas.",
						);
						resolve(null);
					}
				}, "image/png");
			} catch (error) {
				console.error("Error processing mask image data:", error);
				resolve(null);
			}
		});
	};

	// Check if mask has content
	const hasMask = () => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return false;
		}

		// Use consistent context attributes as MaskCanvas
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) {
			console.log("hasMask: No canvas context");
			return false;
		}

		try {
			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const data = imageData.data;

			for (let i = 3; i < data.length; i += 4) {
				if (data[i] > 0) {
					return true; // Found content
				}
			}

			return false; // No content found
		} catch (error) {
			console.error("hasMask: Error getting image data:", error);
			// Added try-catch just in case getImageData fails
			return false; // Treat errors as no mask
		}
	};

	const handleGenerate = async () => {
		if (!prompt.trim()) {
			toast.error("Please enter a prompt");
			return;
		}

		if (!currentWorkspace?._id || !currentProject?._id) {
			toast.error("Workspace or project not found");
			return;
		}

		setState("generating");
		try {
			// Call Convex action
			const result = await generateImageAction({
				prompt,
				model: selectedModel,
				aspectRatio: selectedAspectRatio,
				resolution: "1K", // Default to 1K for now
				workspaceId: currentWorkspace._id,
				projectId: currentProject._id,
			});

			if (!result.success || !result.cdnUrl || !result.key) {
				throw new Error(result.error?.message || "Failed to generate image");
			}

			// Update UI with generated image
			setSelectedImage({
				key: result.key,
				name: `generated-${result.requestId}.png`,
				contentType: "image/png",
				size: 0, // Size not available from action response
			});

			toast.success("Image generated successfully!");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to generate image",
			);
		} finally {
			setState("idle");
		}
	};

	const handleEdit = async () => {
		if (!prompt.trim() || !selectedImage) {
			toast.error("Please enter an edit prompt and select an image");
			return;
		}

		if (!currentWorkspace?._id || !currentProject?._id) {
			toast.error("Workspace or project not found");
			return;
		}

		const maskIsPresent = hasMask();

		if (isMasking && !maskIsPresent) {
			toast.error("Please draw a mask first or disable masking");
			return;
		}

		setState("generating");
		try {
			// Get R2 public URL from env
			const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

			// Build image URLs from keys
			const imageUrls = images.map(
				(image) => `${NEXT_PUBLIC_R2_PUBLIC_URL}/${image.key}`,
			);

			// Call Convex action (always uses nano-banana for edit)
			const result = await editImageAction({
				prompt,
				imageUrls,
				aspectRatio: selectedAspectRatio,
				workspaceId: currentWorkspace._id,
				projectId: currentProject._id,
			});

			if (!result.success || !result.cdnUrl || !result.key) {
				throw new Error(result.error?.message || "Failed to edit image");
			}

			// Update UI with edited image
			setIsMasking(false);
			setSelectedImage({
				key: result.key,
				name: `edited-${result.requestId}.png`,
				contentType: "image/png",
				size: 0, // Size not available from action response
			});
			setPrompt("");

			toast.success("Image edited successfully!");
		} catch (error) {
			console.error("handleEdit error:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to edit image",
			);
		} finally {
			setState("idle");
		}
	};

	return (
		<div className="flex justify-center items-center px-4 py-8 w-full">
			<div className="flex flex-col gap-3 w-full max-w-5xl">
				{/* Generations */}
				{memoizedGenerations?.length && memoizedGenerations.length > 0 && (
					<Generations generations={memoizedGenerations} />
				)}

				<div className="flex gap-3 justify-between items-center">
					{/* Top-left AI settings */}
					<div className="flex flex-wrap gap-3 items-center">
						{/* Aspect Ratio Select */}
						<Select
							value={selectedAspectRatio}
							onValueChange={(v) => setSelectedAspectRatio(v as AspectRatio)}
						>
							<SelectTrigger className="h-8 max-w-fit">
								<div className="flex gap-2 items-center pr-2 whitespace-nowrap">
									<Ratio className="size-3.5" />
									<SelectValue placeholder="Aspect Ratio" />
								</div>
							</SelectTrigger>
							<SelectContent side="top" sideOffset={10}>
								{Object.entries(ASPECT_RATIOS).map(([key, value]) => (
									<SelectItem key={key} value={key}>
										{value} ({key})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{/* Model Select - disabled in edit mode */}
						<Select
							value={selectedModel}
							onValueChange={(v) => setSelectedModel(v as ImageModel)}
							disabled={Boolean(selectedImage)}
						>
							<SelectTrigger className="h-8 max-w-fit">
								<div className="flex gap-2 items-center pr-2 whitespace-nowrap">
									
									<SelectValue placeholder="Model" />
								</div>
							</SelectTrigger>
							<SelectContent side="top" sideOffset={10}>
								{Object.entries(IMAGE_MODELS).map(([key, { name, speed }]) => (
									<SelectItem key={key} value={key}>
										<div className="flex gap-2 items-center">
											<div className="p-1 h-6 rounded-md border bg-muted">
												<GeminiIcon />
											</div>
											<span>
												{name} ({speed})
											</span>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{/* Mask Button */}
						{selectedImage && isSelectedImagePrimary && (
							<MaskButton canvasRef={canvasRef} selectedImage={selectedImage} />
						)}
					</div>
					{/* Right-side buttons */}
					<ImageList selectedImageKey={selectedImage?.key ?? ""} />
				</div>
				{/* Input + Buttons */}
				<div className="flex gap-4 items-center p-2 rounded-lg border shadow-lg bg-background-subtle">
					<Input
						className="bg-transparent border-none outline-none focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
						placeholder="Describe the image you want to generate..."
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
					/>
					<div className="flex bottom-2 right-3 gap-2">
						<Tooltip delayDuration={0}>
							<TooltipTrigger asChild>
								<Button
									size="sm"
									variant="outline"
									className="h-8"
									disabled={
										!prompt.trim() || isMasking || Boolean(selectedImage)
									}
									onClick={handleGenerate}
								>
									Generate{" "}
									<ButtonShortcut>
										<CornerDownRight className="!size-3" />
									</ButtonShortcut>
								</Button>
							</TooltipTrigger>
							<TooltipContent className="text-xs" side="top" sideOffset={5}>
								Generate a new image with AI
							</TooltipContent>
						</Tooltip>
						<Tooltip delayDuration={0}>
							<TooltipTrigger asChild>
								<Button
									size="sm"
									variant="ghost"
									className="h-8"
									disabled={
										!prompt.trim() || !selectedImage || !isSelectedImagePrimary
									}
									onClick={handleEdit}
								>
									Edit <ButtonShortcut>⌘E</ButtonShortcut>
								</Button>
							</TooltipTrigger>
							<TooltipContent className="text-xs" side="top" sideOffset={5}>
								Edit the generated image with AI
							</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</div>
		</div>
	);
};
