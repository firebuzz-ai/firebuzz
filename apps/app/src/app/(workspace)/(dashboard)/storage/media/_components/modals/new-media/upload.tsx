"use client";

import { useNewMediaModal } from "@/app/(workspace)/(dashboard)/storage/media/_components/modals/new-media/use-new-media-modal";
import { useProject } from "@/hooks/auth/use-project";
import {
	api,
	useCachedQuery,
	useMutation,
	useUploadFile,
} from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { FileAudio, FileVideo, Upload, X } from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { formatFileSize, parseMediaFile } from "@firebuzz/utils";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";

type FileWithProgress = {
	file: File;
	uploading: boolean;
};

export const UploadMedia = () => {
	const { files, setFiles, setIsOpen } = useNewMediaModal();
	const [uploadState, setUploadState] = useState<"files" | "upload">("upload");
	const [filesWithProgress, setFilesWithProgress] = useState<
		FileWithProgress[]
	>([]);
	const { currentProject } = useProject();

	const uploadFile = useUploadFile(api.components.r2);
	const createMedia = useMutation(
		api.collections.storage.media.mutations.create,
	);

	const totalSize = useCachedQuery(
		api.collections.storage.media.queries.getTotalSize,
		currentProject
			? {
					projectId: currentProject?._id,
				}
			: "skip",
	);

	// Max file size is 50MB in bytes
	const MAX_FILE_SIZE = 50 * 1024 * 1024;
	const MAX_STORAGE = 1024 * 1024 * 1024;

	useEffect(() => {
		if (files.length > 0) {
			const initialFiles = files.map((file) => ({
				file,
				uploading: false,
			}));
			setFilesWithProgress(initialFiles);
			setUploadState("files");
		} else {
			setUploadState("upload");
		}
	}, [files]);

	const onDrop = (acceptedFiles: File[]) => {
		if (acceptedFiles.length + filesWithProgress.length > 5) {
			toast.error("You can only upload up to 5 files at a time.");
			return;
		}

		const newFiles = acceptedFiles.map((file) => ({
			file,
			uploading: false,
		}));

		setFiles([...files, ...acceptedFiles]);
		setFilesWithProgress((prev) => [...prev, ...newFiles]);
		setUploadState("files");
	};

	const onDropRejected = (fileRejections: FileRejection[]) => {
		if (fileRejections.length > 0) {
			for (const fileRejection of fileRejections) {
				const message = fileRejection.errors[0].message;
				if (message.includes("Too many files")) {
					toast.error("You can only upload up to 5 files at a time.");
				} else if (message.includes("File is larger than 52428800 bytes")) {
					toast.error("File exceeds 50MB size limit.");
				} else if (message.includes("Type not allowed")) {
					toast.error("File type not allowed.");
				} else {
					toast.error(fileRejection.errors[0].message);
				}
			}
		}
	};

	const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
		onDrop,
		onDropRejected,
		accept: {
			"image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
			"video/*": [".mp4", ".webm"],
			"audio/*": [".mp3", ".wav"],
		},
		maxSize: MAX_FILE_SIZE,
		maxFiles: 5,
		noClick: true,
		multiple: true,
	});

	const handleUpload = async () => {
		if (!currentProject) return;

		// Check if user has enough storage
		const usedStorage = totalSize ?? 0;
		const totalUploadSize = filesWithProgress.reduce(
			(acc, file) => acc + file.file.size,
			0,
		);

		if (usedStorage + totalUploadSize > MAX_STORAGE) {
			toast.error("Not enough storage space.", {
				description: "You do not have enough storage to upload these files.",
			});
			return;
		}

		try {
			// Set all files to uploading state
			setFilesWithProgress((prev) =>
				prev.map((file) => ({ ...file, uploading: true })),
			);

			await Promise.all(
				filesWithProgress.map(async (fileWithProgress) => {
					const file = fileWithProgress.file;

					if (file.size > MAX_FILE_SIZE) {
						toast.error(`File ${file.name} exceeds 50MB size limit`);
						return;
					}

					try {
						const key = await uploadFile(file);

						await createMedia({
							key,
							name: file.name,
							type: file.type.split("/")[0] as "image" | "video" | "audio",
							contentType: file.type,
							size: file.size,
							source: "uploaded",
						});
					} catch (error) {
						toast.error(
							error instanceof Error
								? error.message
								: `Unknown error occurred while uploading ${file.name}`,
						);
					}
				}),
			);

			// Clear state and close modal immediately
			setFiles([]);
			setFilesWithProgress([]);
			setIsOpen(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unknown error occurred",
			);
		}
	};

	const removeFile = (index: number) => {
		const newFiles = [...files];
		newFiles.splice(index, 1);

		const newFilesWithProgress = [...filesWithProgress];
		newFilesWithProgress.splice(index, 1);

		setFiles(newFiles);
		setFilesWithProgress(newFilesWithProgress);

		if (newFiles.length === 0) {
			setUploadState("upload");
		}
	};

	if (uploadState === "files") {
		return (
			<div className="relative flex flex-col w-full h-full overflow-hidden">
				<div className="px-4 pt-3 font-medium">
					Files{" "}
					<span className="text-sm text-muted-foreground">
						({filesWithProgress.length})
					</span>
				</div>
				<AnimatePresence initial={false}>
					<motion.div layout className="flex-1 px-4 pt-6 pb-4 space-y-4">
						{filesWithProgress.map((fileWithProgress, index) => {
							const { type, size, extension } = parseMediaFile(
								fileWithProgress.file,
							);
							return (
								<motion.div
									key={`${fileWithProgress.file.name}-${index}`}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, x: -10 }}
									transition={{ duration: 0.2 }}
									className="flex gap-2 px-2 py-2 border rounded-md bg-muted/30"
								>
									{/* Preview */}
									<div className="relative flex items-center justify-center rounded-md size-16 bg-background-subtle">
										{fileWithProgress.uploading && (
											<div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-muted/90">
												<svg className="size-8 animate-spin text-primary">
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
										{type === "image" && (
											<Image
												unoptimized
												src={URL.createObjectURL(fileWithProgress.file)}
												alt={fileWithProgress.file.name}
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
									<div className="flex flex-col justify-between flex-1">
										<div className="max-w-full truncate">
											<p className="text-sm font-medium">
												{fileWithProgress.file.name}
											</p>
											<p className="text-xs text-muted-foreground">
												{formatFileSize(size, "MB", 2)} MB
											</p>
										</div>

										<Badge variant="outline" className="uppercase">
											{extension}
										</Badge>
									</div>
									{/* Cancel Button */}
									<Button
										size="iconSm"
										variant="ghost"
										className="text-muted-foreground"
										onClick={() => removeFile(index)}
										disabled={fileWithProgress.uploading}
									>
										<X className="size-3" />
									</Button>
								</motion.div>
							);
						})}
					</motion.div>
				</AnimatePresence>

				<div className="flex justify-end gap-2 px-4 py-2 border-t">
					<Button
						size="sm"
						variant="outline"
						onClick={() => {
							setFiles([]);
							setFilesWithProgress([]);
							setUploadState("upload");
						}}
						disabled={filesWithProgress.some((f) => f.uploading)}
					>
						Cancel
					</Button>
					<Button
						size="sm"
						onClick={handleUpload}
						disabled={
							filesWithProgress.length === 0 ||
							filesWithProgress.some((f) => f.uploading)
						}
					>
						Upload
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div
			className="relative flex flex-col w-full h-full p-10 overflow-hidden"
			{...getRootProps()}
		>
			<input {...getInputProps()} />

			<div
				className={cn(
					"flex flex-col items-center justify-center w-full h-full p-6 border-2 border-dashed rounded-md transition-colors duration-300 ease-in-out",
					isDragActive ? "bg-muted border-muted-foreground/20" : "",
				)}
			>
				<div className="flex items-center justify-center p-4 mb-4 border rounded-full bg-muted">
					<Upload className="size-8 animate-pulse" />
				</div>
				<div className="text-center">
					<p className="text-lg font-medium">Drag and drop media here</p>
					<p className="max-w-xs mt-1 text-xs text-muted-foreground">
						Supported formats: PNG, JPG, JPEG, WebP, GIF, MP4, WebM, MP3, WAV
						and up to 5 files at a time.
					</p>
				</div>
				<Button size="sm" className="mt-4" onClick={open}>
					Browse Files
				</Button>
			</div>
		</div>
	);
};
