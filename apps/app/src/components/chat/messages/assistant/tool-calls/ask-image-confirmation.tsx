import { useMutation, useUploadFile } from "@firebuzz/convex";
import { api } from "@firebuzz/convex/nextjs";
import { envCloudflarePublic } from "@firebuzz/env";
import { TextShimmer } from "@firebuzz/ui/components/reusable/text-shimmer";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import {
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Loader2,
	Maximize2,
	X,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { parseMediaFile } from "@firebuzz/utils";
import type { Message, ToolInvocation } from "ai";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import {
	type Dispatch,
	memo,
	type SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

interface ToolCallProps {
	toolCall: ToolInvocation;
	message: Message;
	addToolResult: ({
		toolCallId,
		result,
	}: {
		toolCallId: string;
		// biome-ignore lint/suspicious/noExplicitAny: AI SDK tool result type flexibility
		result: any;
	}) => void;
}

interface ImagePlacement {
	id: string;
	location: string;
	description: string;
	requiredCount: number;
	aspectRatio?: "landscape" | "portrait" | "square" | "any";
}

interface AskImageConfirmationSharedProps {
	isExpanded: boolean;
	setIsExpanded: (value: boolean) => void;
	status: ToolInvocation["state"];
	placements?: ImagePlacement[];
}

const AskImageConfirmationPartial = memo(
	({
		isExpanded,
		setIsExpanded,
		placements,
	}: AskImageConfirmationSharedProps) => {
		return (
			<>
				<div
					className={cn(
						"flex justify-between items-center px-3 py-2 bg-muted/30",
						{ "border-b": isExpanded },
					)}
				>
					<div className="flex gap-1 items-center">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="p-0 w-6 h-6"
							onClick={() => setIsExpanded(!isExpanded)}
						>
							{isExpanded ? (
								<ChevronDown className="size-3.5" />
							) : (
								<ChevronRight className="size-3.5" />
							)}
						</Button>
						<TextShimmer
							as="span"
							duration={1.5}
							className="ml-2 text-sm italic"
						>
							Choose image(s)
						</TextShimmer>
					</div>
				</div>

				<AnimatePresence initial={false}>
					{isExpanded && (
						<motion.div
							initial={{ height: 0 }}
							animate={{ height: "auto" }}
							exit={{ height: 0 }}
							className="overflow-hidden"
						>
							<div className="p-4">
								{placements && placements.length > 0 && (
									<div className="mb-4 space-y-2">
										<h4 className="text-sm font-medium">Image Requirements:</h4>
										{placements.map((placement) => (
											<div
												key={placement.id}
												className="flex gap-2 items-center text-xs text-muted-foreground"
											>
												<Skeleton className="w-4 h-4 rounded" />
												<Skeleton className="w-48 h-4" />
											</div>
										))}
									</div>
								)}

								<div className="flex overflow-x-auto gap-3 pb-2">
									{[...Array(6)].map((_, i) => (
										<Skeleton
											key={`skeleton-${
												// biome-ignore lint/suspicious/noArrayIndexKey: generated images with index fallback for uniqueness
												i
											}`}
											className="flex-shrink-0 w-48 h-32"
										/>
									))}
								</div>

								<div className="flex gap-2 justify-end mt-4">
									<Skeleton className="w-24 h-8" />
									<Skeleton className="w-24 h-8" />
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</>
		);
	},
);

interface AskImageConfirmationContentProps
	extends AskImageConfirmationSharedProps {
	images?: {
		id: string;
		width: number;
		height: number;
		url: string;
		altText: string;
		downloadLink: string;
	}[];
	toolCallId: string;
	selectedImages: string[];
	toggleImage: (imageId: string) => void;
	uploadedUrls: Record<string, string>;
	isUploading: boolean;
	uploadImages: () => Promise<void>;
	setSelectedImages: Dispatch<SetStateAction<string[]>>;
	status: ToolInvocation["state"];
}

const AskImageConfirmationContent = memo(
	({
		toolCallId,
		isExpanded,
		setIsExpanded,
		images,
		selectedImages,
		/*     toggleImage, */
		uploadedUrls,
		isUploading,
		uploadImages,
		status,
		setSelectedImages,
		placements,
	}: AskImageConfirmationContentProps) => {
		const [currentImageIndex, setCurrentImageIndex] = useState(0);
		const [isFullscreen, setIsFullscreen] = useState(false);
		const scrollRef = useRef<HTMLDivElement>(null);

		const totalRequired =
			placements?.reduce((sum, p) => sum + p.requiredCount, 0) || 0;
		const selectionProgress = Math.min(selectedImages.length, totalRequired);

		// Group images by placement if needed
		const placementSelections = useMemo(() => {
			if (!placements) return {};

			const selections: Record<string, string[]> = {};
			let imageIndex = 0;

			for (const placement of placements) {
				selections[placement.id] = selectedImages.slice(
					imageIndex,
					imageIndex + placement.requiredCount,
				);
				imageIndex += placement.requiredCount;
			}

			return selections;
		}, [placements, selectedImages]);

		const scrollToImage = useCallback((index: number) => {
			if (scrollRef.current) {
				const imageWidth = 192; // w-48 = 12rem = 192px
				const gap = 16; // gap-4 = 1rem = 16px
				const scrollLeft =
					index * (imageWidth + gap) -
					scrollRef.current.clientWidth / 2 +
					imageWidth / 2;
				scrollRef.current.scrollTo({
					left: Math.max(0, scrollLeft),
					behavior: "smooth",
				});
			}
		}, []);

		useEffect(() => {
			scrollToImage(currentImageIndex);
		}, [currentImageIndex, scrollToImage]);

		// Enhanced toggleImage with selection limit
		const enhancedToggleImage = useCallback(
			(imageId: string) => {
				if (status === "result") return;

				setSelectedImages((prev: string[]) => {
					const isCurrentlySelected = prev.includes(imageId);

					if (isCurrentlySelected) {
						// Always allow deselection
						return prev.filter((id: string) => id !== imageId);
					}

					// Check if we can add more images
					if (totalRequired > 0 && prev.length >= totalRequired) {
						toast.error(
							`You can only select ${totalRequired} image${totalRequired !== 1 ? "s" : ""}`,
						);
						return prev;
					}
					// Add the image
					return [...prev, imageId];
				});
			},
			[status, totalRequired, setSelectedImages],
		);

		// Create placement assignments for selected images
		const placementAssignments = useMemo(() => {
			if (!placements) return {};

			const assignments: Record<
				string,
				{ placementId: string; orderInPlacement: number }
			> = {};
			let globalIndex = 0;

			for (const placement of placements) {
				for (let i = 0; i < placement.requiredCount; i++) {
					if (globalIndex < selectedImages.length) {
						const imageId = selectedImages[globalIndex];
						assignments[imageId] = {
							placementId: placement.id,
							orderInPlacement: i + 1,
						};
					}
					globalIndex++;
				}
			}

			return assignments;
		}, [placements, selectedImages]);

		// Enhanced image navigation with keyboard support
		const navigateImage = useCallback(
			(direction: "prev" | "next") => {
				if (!images?.length) return;

				if (direction === "prev") {
					setCurrentImageIndex((prev) => Math.max(0, prev - 1));
				} else {
					setCurrentImageIndex((prev) => Math.min(images.length - 1, prev + 1));
				}
			},
			[images],
		);

		// Keyboard navigation for carousel and fullscreen
		useEffect(() => {
			const handleKeyDown = (e: KeyboardEvent) => {
				if (!isExpanded) return;

				switch (e.key) {
					case "ArrowLeft":
						e.preventDefault();
						navigateImage("prev");
						break;
					case "ArrowRight":
						e.preventDefault();
						navigateImage("next");
						break;
					case "Escape":
						if (isFullscreen) {
							e.preventDefault();
							setIsFullscreen(false);
						}
						break;
				}
			};

			if (isExpanded) {
				document.addEventListener("keydown", handleKeyDown);
				return () => {
					document.removeEventListener("keydown", handleKeyDown);
				};
			}
		}, [isExpanded, isFullscreen, navigateImage]);

		return (
			<div tabIndex={-1} className="outline-none">
				<div
					className={cn(
						"flex justify-between items-center px-3 py-2 bg-muted/30",
						{ "border-b": isExpanded },
					)}
				>
					<div className="flex gap-1 items-center">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="p-0 w-6 h-6"
							onClick={() => setIsExpanded(!isExpanded)}
						>
							{isExpanded ? (
								<ChevronDown className="size-3.5" />
							) : (
								<ChevronRight className="size-3.5" />
							)}
						</Button>
						<TextShimmer
							as="span"
							duration={1.5}
							className="ml-2 text-sm italic"
							active={status !== "result"}
						>
							Choose image(s)
						</TextShimmer>
						{totalRequired > 0 && (
							<Badge variant="outline" className="ml-2">
								{selectionProgress}/{totalRequired}
							</Badge>
						)}
					</div>
					{/* Refresh functionality removed */}
				</div>

				<AnimatePresence initial={false}>
					{isExpanded && (
						<motion.div
							initial={{ height: 0 }}
							animate={{ height: "auto" }}
							exit={{ height: 0 }}
							className="overflow-hidden"
						>
							<div className="p-4 pt-6">
								{/* Placement Requirements */}
								{placements && placements.length > 0 && (
									<div className="p-3 mb-4 space-y-2 rounded-md border bg-muted">
										<h4 className="text-sm font-medium text-primary">
											Image Requirements:
										</h4>
										{placements.map((placement) => {
											const placementImages =
												placementSelections[placement.id] || [];
											const isComplete =
												placementImages.length >= placement.requiredCount;

											return (
												<div
													key={placement.id}
													className="flex gap-2 items-start"
												>
													<div
														className={cn(
															"mt-0.5 w-4 h-4 rounded flex items-center justify-center",
															isComplete
																? "bg-green-500 text-white"
																: "bg-muted-foreground/20",
														)}
													>
														{isComplete && <Check className="w-3 h-3" />}
													</div>
													<div className="flex-1">
														<p className="text-sm font-medium">
															{placement.location}
														</p>
														<p className="text-xs text-muted-foreground">
															{placement.description}
														</p>
														<p className="text-xs text-muted-foreground">
															{placement.requiredCount} image
															{placement.requiredCount !== 1 ? "s" : ""}{" "}
															required
															{placement.aspectRatio &&
																placement.aspectRatio !== "any" &&
																` • ${placement.aspectRatio} format`}
														</p>
													</div>
												</div>
											);
										})}
									</div>
								)}

								{/* Search functionality removed */}

								{/* Image Carousel */}
								<div className="mt-4">
									<div
										ref={scrollRef}
										className="flex overflow-x-auto gap-4 px-3 py-4 scroll-smooth [&::-webkit-scrollbar]:hidden"
										style={{
											scrollbarWidth: "none",
											msOverflowStyle: "none",
										}}
									>
										{images?.map((image, index) => {
											const isSelected = selectedImages.includes(image.id);
											const assignment = placementAssignments[image.id];
											const placement = placements?.find(
												(p) => p.id === assignment?.placementId,
											);

											return (
												<div
													key={`${image.id}-${toolCallId}`}
													className={cn(
														"relative w-full max-w-64 h-40 flex-shrink-0 overflow-hidden rounded-lg border cursor-pointer group transition-all duration-300",
														isSelected && "ring-2 ring-brand",
														!isSelected && status === "result" && "grayscale",
														index === currentImageIndex &&
															!isSelected &&
															"ring-2 ring-primary/20",
														"hover:scale-[1.02] bg-background",
													)}
													onClick={() => {
														enhancedToggleImage(image.id);
														setCurrentImageIndex(index);
													}}
												>
													<Image
														unoptimized
														src={image.url}
														alt={image.altText || `Image ${image.id}`}
														fill
														className="object-cover transition-all duration-300 group-hover:scale-105"
														sizes="192px"
													/>
													<div className="absolute inset-0 bg-gradient-to-t to-transparent opacity-0 transition-opacity from-black/30 group-hover:opacity-100" />

													{/* Selection indicator with placement info */}
													{isSelected && (
														<div className="absolute top-2 right-2">
															<div className="p-1 rounded-md border bg-muted">
																{placement ? (
																	<div className="flex gap-1 items-center">
																		<span className="text-xs font-medium">
																			{assignment?.orderInPlacement}/
																			{placement.requiredCount}
																		</span>
																	</div>
																) : (
																	<Check className="size-3.5 text-emerald-500" />
																)}
															</div>
															{placement && (
																<div className="absolute right-0 top-full z-30 px-2 py-1 mt-1 text-xs text-white rounded opacity-0 transition-opacity pointer-events-none bg-black/90 group-hover:opacity-100 max-w-40">
																	<div className="truncate">
																		{placement.location}
																	</div>
																</div>
															)}
														</div>
													)}

													{/* Fullscreen button */}
													<Button
														type="button"
														variant="outline"
														size="iconXs"
														className="absolute bottom-2 left-2 bg-muted"
														onClick={(e) => {
															e.stopPropagation();
															setCurrentImageIndex(index);
															setIsFullscreen(true);
														}}
													>
														<Maximize2 className="w-3 h-3" />
													</Button>
												</div>
											);
										})}
									</div>

									{/* Bottom Navigation */}
									{images && images.length > 1 && (
										<div className="flex gap-4 justify-center items-center mt-4">
											<Button
												type="button"
												variant="outline"
												size="iconXs"
												onClick={() => navigateImage("prev")}
												disabled={currentImageIndex === 0}
											>
												<ChevronLeft className="w-4 h-4" />
											</Button>
											<div className="text-xs text-muted-foreground">
												{currentImageIndex + 1} / {images.length}
											</div>
											<Button
												type="button"
												variant="outline"
												size="iconXs"
												onClick={() => navigateImage("next")}
												disabled={currentImageIndex === images.length - 1}
											>
												<ChevronRight className="w-4 h-4" />
											</Button>
										</div>
									)}

									{/* Single image counter */}
									{images && images.length === 1 && (
										<div className="mt-2 text-xs text-center text-muted-foreground">
											1 / 1
										</div>
									)}
								</div>

								{status !== "result" && (
									<div className="flex gap-2 justify-end mt-4">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => setSelectedImages([])}
											disabled={selectedImages.length === 0 || isUploading}
										>
											Clear
										</Button>
										<Button
											type="button"
											size="sm"
											onClick={uploadImages}
											disabled={
												selectedImages.length === 0 ||
												(totalRequired > 0 &&
													selectedImages.length !== totalRequired) ||
												isUploading ||
												Object.keys(uploadedUrls).length > 0
											}
										>
											{isUploading ? (
												<>
													<Loader2 className="mr-2 w-4 h-4 animate-spin" />
													Selecting...
												</>
											) : (
												`Confirm Selection ${selectedImages.length > 0 ? `(${selectedImages.length}/${totalRequired})` : ""}`
											)}
										</Button>
									</div>
								)}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
				{/* Fullscreen Image Viewer */}
				{isFullscreen && images && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="flex fixed inset-0 z-50 justify-center items-center bg-black/90"
						onClick={() => setIsFullscreen(false)}
					>
						<Button
							type="button"
							variant="outline"
							size="iconXs"
							className="absolute top-4 right-4"
							onClick={() => setIsFullscreen(false)}
						>
							<X className="w-5 h-5" />
						</Button>

						{images.length > 1 && (
							<>
								<Button
									type="button"
									variant="outline"
									size="iconXs"
									className="absolute left-4 top-1/2 -translate-y-1/2 bg-muted"
									onClick={(e) => {
										e.stopPropagation();
										navigateImage("prev");
									}}
									disabled={currentImageIndex === 0}
								>
									<ChevronLeft className="w-4 h-4" />
								</Button>
								<Button
									type="button"
									variant="outline"
									size="iconXs"
									className="absolute right-4 top-1/2 -translate-y-1/2 bg-muted"
									onClick={(e) => {
										e.stopPropagation();
										navigateImage("next");
									}}
									disabled={currentImageIndex === images.length - 1}
								>
									<ChevronRight className="w-4 h-4" />
								</Button>
							</>
						)}

						<div
							className="relative max-w-[90vw] max-h-[90vh]"
							onClick={(e) => e.stopPropagation()}
						>
							<Image
								unoptimized
								src={images[currentImageIndex].url}
								alt={
									images[currentImageIndex].altText ||
									`Image ${currentImageIndex + 1}`
								}
								width={800}
								height={600}
								className="object-contain"
							/>
						</div>

						<div className="absolute bottom-4 left-1/2 text-sm text-white -translate-x-1/2">
							{currentImageIndex + 1} / {images.length}
						</div>
					</motion.div>
				)}
			</div>
		);
	},
);

interface StockImage {
	id: string;
	width: number;
	height: number;
	url: string;
	altText: string;
	downloadLink: string;
}

export const AskImageConfirmation = memo(
	({ toolCall, addToolResult, message }: ToolCallProps) => {
		const result =
			toolCall.state === "result"
				? (toolCall.result as Record<string, string>)
				: undefined;
		const selectedIdsFromResult = result
			? Object.keys(result).filter((key) => result[key])
			: [];
		const [isExpanded, setIsExpanded] = useState(toolCall.state !== "result");
		const [selectedImages, setSelectedImages] = useState<string[]>(
			selectedIdsFromResult,
		);
		const [isUploading, setIsUploading] = useState(false);
		const [uploadedUrls, setUploadedUrls] = useState<Record<string, string>>(
			{},
		);

		// Extract placement information from tool arguments
		const placements: ImagePlacement[] = useMemo(() => {
			if (
				toolCall.args &&
				typeof toolCall.args === "object" &&
				"placements" in toolCall.args
			) {
				return toolCall.args.placements as ImagePlacement[];
			}
			return [];
		}, [toolCall.args]);

		const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
		const uploadFile = useUploadFile(api.components.r2);
		const createMedia = useMutation(
			api.collections.storage.media.mutations.create,
		);

		const status = toolCall.state;

		const images = useMemo((): StockImage[] => {
			if (!message?.parts?.length) return [];

			const imageMap = new Map<string, StockImage>();

			// Collect all images from searchStockImage tool calls
			for (const part of message.parts) {
				// Skip parts that aren't searchStockImage tool invocations with results
				if (
					part.type !== "tool-invocation" ||
					part.toolInvocation.toolName !== "searchStockImage" ||
					part.toolInvocation.state !== "result"
				) {
					continue;
				}

				// Process the result images
				const resultImages = part.toolInvocation.result.images || [];
				for (const image of resultImages) {
					if (!image?.id) continue;

					imageMap.set(image.id, {
						id: image.id,
						width: image.width,
						height: image.height,
						url: image.url,
						downloadLink: image.downloadLink,
						altText: image.altText || "",
					});
				}
			}

			return Array.from(imageMap.values());
		}, [message]);

		const toggleImage = (imageId: string) => {
			if (result) return;

			setSelectedImages((prev: string[]) => {
				const isCurrentlySelected = prev.includes(imageId);

				if (isCurrentlySelected) {
					// Always allow deselection
					return prev.filter((id: string) => id !== imageId);
				}

				// Check if we can add more images
				const totalRequired =
					placements?.reduce((sum, p) => sum + p.requiredCount, 0) || 0;
				if (totalRequired > 0 && prev.length >= totalRequired) {
					toast.error(
						`You can only select ${totalRequired} image${totalRequired !== 1 ? "s" : ""}`,
					);
					return prev;
				}
				// Add the image
				return [...prev, imageId];
			});
		};

		const uploadImages = async () => {
			if (selectedImages.length === 0) {
				toast.error("Please select at least one image");
				return;
			}

			setIsUploading(true);
			const uploadResults: Record<string, string> = {};
			const successfulUploads: string[] = [];
			const failedUploads: string[] = [];

			try {
				for (const imageId of selectedImages) {
					const imageData = images?.find((img) => img.id === imageId);
					if (!imageData) continue;

					try {
						// Fetch the image
						const response = await fetch(imageData.url);
						if (!response.ok) {
							failedUploads.push(imageId);
							continue;
						}

						const blob = await response.blob();
						const fileName = `unsplash-${imageId}-${Date.now()}.jpg`;
						const file = new File([blob], fileName, {
							type: blob.type || "image/jpeg",
						});

						// Upload to R2
						const key = await uploadFile(file);

						// Create media record
						const { type, contentType } = parseMediaFile(file);
						await createMedia({
							key,
							type,
							contentType,
							size: file.size,
							name: file.name,
							source: "unsplash",
						});

						const cdnUrl = `${NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;
						uploadResults[imageId] = cdnUrl;
						successfulUploads.push(imageId);
					} catch (error) {
						console.error(`Failed to upload image ${imageId}:`, error);
						failedUploads.push(imageId);
					}
				}

				setUploadedUrls(uploadResults);

				// Show toast with results
				if (successfulUploads.length > 0) {
					toast.success(
						`Successfully uploaded ${successfulUploads.length} images`,
					);
				}
				if (failedUploads.length > 0) {
					toast.error(`Failed to upload ${failedUploads.length} images`);
				}

				// Send results to AI
				if (Object.keys(uploadResults).length > 0) {
					addToolResult({
						toolCallId: toolCall.toolCallId,
						result: uploadResults,
					});
				}
			} catch (error) {
				console.error("Failed to upload images:", error);
				toast.error("Failed to upload images");
			} finally {
				setIsUploading(false);
			}
		};

		return (
			<div className="overflow-hidden mb-4 rounded-md border">
				{status === "partial-call" ? (
					<AskImageConfirmationPartial
						isExpanded={isExpanded}
						setIsExpanded={setIsExpanded}
						status={status}
						placements={placements}
					/>
				) : (
					<AskImageConfirmationContent
						toolCallId={toolCall.toolCallId}
						isExpanded={isExpanded}
						setIsExpanded={setIsExpanded}
						images={images}
						selectedImages={selectedImages}
						toggleImage={toggleImage}
						uploadedUrls={uploadedUrls}
						isUploading={isUploading}
						uploadImages={uploadImages}
						status={status}
						setSelectedImages={setSelectedImages}
						placements={placements}
					/>
				)}
			</div>
		);
	},
);
