"use client";

import {
	api,
	useCachedQuery,
	useMutation,
	useUploadFile,
} from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	Check,
	FileAudio,
	FileVideo,
	Plus,
	Upload,
	X,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { formatFileSize, parseMediaFile } from "@firebuzz/utils";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { type Accept, type FileRejection, useDropzone } from "react-dropzone";
import { useProject } from "@/hooks/auth/use-project";

// Define expected structure for onSelect based on usage (same as GalleryTab)
interface SelectedMediaItem {
	url: string;
	key: string;
	fileName: string;
	type: "image" | "video" | "audio";
	contentType: string;
	description: string;
	size: number;
}

interface UploadTabProps {
	onSelect: (media: SelectedMediaItem[]) => void;
	allowedTypes: ("image" | "video" | "audio")[];
	allowMultiple: boolean;
	maxFiles: number;
	setIsOpen: (isOpen: boolean) => void;
}

type FileWithProgress = {
	file: File;
	uploading: boolean;
	key?: string; // Store the key after successful upload
	error?: string; // Store error message if upload fails
};

export const UploadTab = ({
	onSelect,
	allowedTypes,
	allowMultiple,
	maxFiles,
	setIsOpen,
}: UploadTabProps) => {
	const [filesWithProgress, setFilesWithProgress] = useState<
		FileWithProgress[]
	>([]);
	const [isUploading, setIsUploading] = useState(false);
	const { currentProject } = useProject();
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

	const uploadFile = useUploadFile(api.components.r2);
	const createMedia = useMutation(
		api.collections.storage.media.mutations.create,
	);

	const totalSize = useCachedQuery(
		api.collections.storage.media.queries.getTotalSize,
		currentProject ? { projectId: currentProject._id } : "skip",
	);

	// Constants from original upload component
	const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
	const MAX_STORAGE = 1024 * 1024 * 1024; // 1GB

	// Generate accept object based on allowedTypes
	const generateAcceptTypes = (): Accept => {
		const accept: Accept = {};
		if (allowedTypes.includes("image")) {
			accept["image/*"] = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
		}
		if (allowedTypes.includes("video")) {
			accept["video/*"] = [".mp4", ".webm"];
		}
		if (allowedTypes.includes("audio")) {
			accept["audio/*"] = [".mp3", ".wav"];
		}
		return accept;
	};

	const currentMaxFiles = allowMultiple ? maxFiles : 1;

	const onDrop = (acceptedFiles: File[]) => {
		let filesToAdd = acceptedFiles;
		if (acceptedFiles.length + filesWithProgress.length > currentMaxFiles) {
			toast.error(
				`You can only upload up to ${currentMaxFiles} file${currentMaxFiles > 1 ? "s" : ""}.`,
			);
			// Keep only the allowed number of files
			filesToAdd = acceptedFiles.slice(
				0,
				currentMaxFiles - filesWithProgress.length,
			);
			if (filesToAdd.length === 0) return;
		}

		const newFiles = filesToAdd.map((file) => ({
			file,
			uploading: false,
		}));

		setFilesWithProgress((prev) =>
			[...prev, ...newFiles].slice(0, currentMaxFiles),
		);
	};

	const onDropRejected = (fileRejections: FileRejection[]) => {
		for (const fileRejection of fileRejections) {
			const message = fileRejection.errors[0]?.message ?? "Unknown error";
			const fileName = fileRejection.file.name;

			if (message.includes("Too many files")) {
				toast.error(
					`Cannot add ${fileName}: Exceeds max file limit of ${currentMaxFiles}.`,
				);
			} else if (message.includes("File is larger than")) {
				toast.error(`Cannot add ${fileName}: Exceeds 50MB size limit.`);
			} else if (message.includes("File type must be one of")) {
				toast.error(`Cannot add ${fileName}: File type not allowed.`);
			} else {
				toast.error(`Cannot add ${fileName}: ${message}`);
			}
		}
	};

	const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
		onDrop,
		onDropRejected,
		accept: generateAcceptTypes(),
		maxSize: MAX_FILE_SIZE,
		maxFiles: allowMultiple ? undefined : 1, // Let our custom logic handle maxFiles for multiple
		multiple: allowMultiple,
		noClick: true,
	});

	const handleUploadAndSelect = async () => {
		if (!currentProject || filesWithProgress.length === 0) return;

		const usedStorage = totalSize ?? 0;
		const totalUploadSize = filesWithProgress.reduce(
			(acc, item) => acc + item.file.size,
			0,
		);

		if (usedStorage + totalUploadSize > MAX_STORAGE) {
			toast.error("Not enough storage space.", {
				description: "You do not have enough storage to upload these files.",
			});
			return;
		}

		setIsUploading(true);
		setFilesWithProgress((prev) =>
			prev.map((item) => ({ ...item, uploading: true, error: undefined })),
		);

		const uploadPromises = filesWithProgress.map(async (item, index) => {
			try {
				const key = await uploadFile(item.file);
				await createMedia({
					key,
					name: item.file.name,
					type: item.file.type.split("/")[0] as "image" | "video" | "audio",
					contentType: item.file.type,
					size: item.file.size,
					source: "uploaded",
				});
				// Update state for this specific file on success
				setFilesWithProgress((prev) =>
					prev.map((f, i) =>
						i === index ? { ...f, uploading: false, key } : f,
					),
				);
				return {
					url: `${NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`,
					key,
					fileName: item.file.name,
					type: item.file.type.split("/")[0] as "image" | "video" | "audio",
					contentType: item.file.type,
					description: "",
					size: item.file.size,
				};
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: `Failed to upload ${item.file.name}`;
				toast.error(errorMessage);
				// Update state for this specific file on error
				setFilesWithProgress((prev) =>
					prev.map((f, i) =>
						i === index ? { ...f, uploading: false, error: errorMessage } : f,
					),
				);
				return null; // Indicate failure
			}
		});

		const results = await Promise.all(uploadPromises);
		const successfulUploads = results.filter(
			(result): result is SelectedMediaItem => result !== null,
		);

		setIsUploading(false); // Overall upload process finished

		if (successfulUploads.length > 0) {
			toast.success(
				`${successfulUploads.length} file${successfulUploads.length > 1 ? "s" : ""} uploaded successfully!`,
			);
			onSelect(successfulUploads);
			setIsOpen(false);
			// Optionally clear files after successful selection:
			// setFilesWithProgress([]);
		} else if (filesWithProgress.some((f) => f.error)) {
			toast.warning(
				"Some files failed to upload. Please review and try again.",
			);
			// Keep files with errors for user to see/remove
			setFilesWithProgress((prev) => prev.filter((f) => f.error));
		}
	};

	const removeFile = (index: number) => {
		setFilesWithProgress((prev) => prev.filter((_, i) => i !== index));
	};

	const hasFiles = filesWithProgress.length > 0;

	return (
		<div
			className={cn(
				"relative flex flex-col w-full h-full overflow-hidden",
				!hasFiles && "p-4",
			)}
			{...getRootProps()}
		>
			<input {...getInputProps()} />

			{!hasFiles ? (
				// Dropzone View
				<div
					className={cn(
						"flex flex-col items-center justify-center w-full h-full p-6 border-2 border-dashed rounded-md transition-colors duration-300 ease-in-out",
						isDragActive
							? "bg-muted border-muted-foreground/20"
							: "border-border/50",
						allowedTypes.length === 0 && "opacity-50 cursor-not-allowed", // Disable visually if no types allowed
					)}
				>
					<div className="flex items-center justify-center p-4 mb-4 border rounded-full bg-muted">
						<Upload className="size-8 animate-pulse text-muted-foreground" />
					</div>
					<div className="text-center">
						<p className="text-lg font-medium">Drag and drop media here</p>
						<p className="max-w-xs mt-1 text-xs text-muted-foreground">
							Allowed: {allowedTypes.join(", ") || "None"}. Max{" "}
							{currentMaxFiles} file{currentMaxFiles > 1 ? "s" : ""}, up to 50MB
							each.
						</p>
					</div>
					<Button
						size="sm"
						className="mt-4"
						onClick={(e) => {
							e.stopPropagation();
							open();
						}} // Prevent dropzone trigger on button click
						disabled={allowedTypes.length === 0} // Disable button if no types allowed
					>
						Browse Files
					</Button>
				</div>
			) : (
				// Files List View
				<div className="flex flex-col h-full">
					<div className="px-4 pt-3 font-medium">
						Files{" "}
						<span className="text-sm text-muted-foreground">
							({filesWithProgress.length}/{currentMaxFiles})
						</span>
					</div>
					<AnimatePresence initial={false}>
						<motion.div
							layout
							className="flex-1 px-4 pt-3 pb-4 space-y-4 overflow-y-auto"
						>
							{filesWithProgress.map((item, index) => {
								const { type, size, extension } = parseMediaFile(item.file);
								return (
									<motion.div
										key={`${item.file.name}-${index}-${item.file.lastModified}`} // More unique key
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, x: -10 }}
										transition={{ duration: 0.2 }}
										className={cn(
											"flex gap-2 px-2 py-2 border rounded-md bg-muted/30",
											item.error && "border-destructive bg-destructive/10", // Highlight errors
										)}
									>
										{/* Preview */}
										<div className="relative flex items-center justify-center rounded-md size-16 bg-background-subtle shrink-0">
											{item.uploading && (
												<div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-muted/90">
													{/* Spinner SVG */}
													<svg
														className="size-8 animate-spin text-primary" /* ... spinner svg paths ... */
													>
														<circle
															className="text-muted/30"
															strokeWidth="2"
															stroke="currentColor"
															fill="transparent"
															r="15"
															cx="16"
															cy="16"
														/>
														<circle
															className="text-primary"
															strokeWidth="2"
															strokeDasharray={94.2}
															strokeDashoffset={70}
															strokeLinecap="round"
															stroke="currentColor"
															fill="transparent"
															r="15"
															cx="16"
															cy="16"
														/>
													</svg>
												</div>
											)}
											{!item.uploading &&
												item.key && ( // Show checkmark on success
													<div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-success/10">
														<Check className="text-success size-8" />
													</div>
												)}
											{!item.uploading &&
												item.error && ( // Show X on error
													<div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-destructive/10">
														<X className="text-destructive size-8" />
													</div>
												)}

											{type === "image" &&
												URL.createObjectURL && ( // Check if function exists (SSR safety)
													<Image
														unoptimized
														src={URL.createObjectURL(item.file)}
														alt={item.file.name}
														fill
														className="object-cover rounded-md"
													/>
												)}
											{type === "video" && (
												<FileVideo className="size-8 text-muted-foreground" />
											)}
											{type === "audio" && (
												<FileAudio className="size-8 text-muted-foreground" />
											)}
										</div>
										{/* File Info */}
										<div className="flex flex-col justify-between flex-1 min-w-0">
											{" "}
											{/* Added min-w-0 for truncation */}
											<div className="max-w-full truncate">
												<p className="text-sm font-medium truncate">
													{item.file.name}
												</p>
												<p className="text-xs text-muted-foreground">
													{formatFileSize(size, "MB", 2)} MB
												</p>
												{item.error && ( // Display error message
													<p className="text-xs truncate text-destructive">
														{item.error}
													</p>
												)}
											</div>
											<Badge variant="outline" className="uppercase w-fit">
												{" "}
												{/* Added w-fit */}
												{extension}
											</Badge>
										</div>
										{/* Cancel Button */}
										<Tooltip delayDuration={0}>
											<TooltipTrigger asChild>
												<Button
													size="iconSm"
													variant="ghost"
													className="text-muted-foreground shrink-0"
													onClick={(e) => {
														e.stopPropagation();
														removeFile(index);
													}} // Stop propagation
													disabled={item.uploading}
												>
													<X className="size-3" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>Remove</TooltipContent>
										</Tooltip>
									</motion.div>
								);
							})}
							{/* Add More Files Button */}
							{allowMultiple && filesWithProgress.length < currentMaxFiles && (
								<motion.button
									layout
									onClick={(e) => {
										e.stopPropagation();
										open();
									}}
									disabled={
										isUploading || filesWithProgress.length >= currentMaxFiles
									}
									className="flex items-center justify-center w-full h-16 gap-2 text-sm border-2 border-dashed rounded-md border-border/50 text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Plus className="size-4" /> Add More
								</motion.button>
							)}
						</motion.div>
					</AnimatePresence>

					{/* Footer with Actions */}
					<div className="flex justify-end gap-2 px-4 py-2 border-t">
						<Button
							size="sm"
							variant="outline"
							onClick={() => setFilesWithProgress([])} // Clear all files
							disabled={isUploading}
						>
							Clear All
						</Button>
						<Button
							size="sm"
							onClick={handleUploadAndSelect}
							disabled={
								isUploading ||
								filesWithProgress.length === 0 ||
								filesWithProgress.every((f) => f.key || f.error)
							} // Disable if uploading, no files, or all processed
						>
							{isUploading
								? "Uploading..."
								: `Upload & Select (${filesWithProgress.filter((f) => !f.key && !f.error).length})`}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
};
