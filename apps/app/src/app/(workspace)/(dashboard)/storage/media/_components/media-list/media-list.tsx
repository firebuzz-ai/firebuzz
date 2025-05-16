"use client";

import { AIImageModal } from "@/components/modals/media/ai-image/ai-image-modal";
import { MediaGalleryModal } from "@/components/modals/media/gallery/gallery-modal";
import { useProject } from "@/hooks/auth/use-project";
import {
	type Doc,
	api,
	useCachedQuery,
	usePaginatedQuery,
} from "@firebuzz/convex";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Upload } from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { useDebounce } from "use-debounce";
import { Controls } from "../controls";
import { MediaDetailsModal } from "../modals/modal";
import { NewMediaModal } from "../modals/new-media/modal";
import { useNewMediaModal } from "../modals/new-media/use-new-media-modal";
import { Footer } from "./footer";
import { MediaItem } from "./media-item";
import { SelectedMenu } from "./selected-menu";

export const MediaList = () => {
	const { currentProject } = useProject();
	const [selected, setSelected] = useState<string[]>([]);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
	const [source, setSource] = useState<Doc<"media">["source"] | "all">("all");
	const { setState } = useNewMediaModal();

	const totalSize = useCachedQuery(
		api.collections.storage.media.queries.getTotalSize,
		currentProject
			? {
					projectId: currentProject?._id,
				}
			: "skip",
	);

	const totalCount = useCachedQuery(
		api.collections.storage.media.queries.getTotalCount,
		currentProject
			? {
					projectId: currentProject?._id,
				}
			: "skip",
	);

	const {
		results: mediaItems,
		status,
		loadMore,
	} = usePaginatedQuery(
		api.collections.storage.media.queries.getPaginated,
		{
			sortOrder,
			searchQuery: debouncedSearchQuery,
			source: source !== "all" ? source : undefined,
		},
		{ initialNumItems: 10 },
	);

	const loaderRef = useRef<HTMLDivElement>(null);

	// Why: 50MB in bytes
	const MAX_FILE_SIZE = 50 * 1024 * 1024;
	const MAX_STORAGE = 1024 * 1024 * 1024;

	const onDrop = async (acceptedFiles: File[]) => {
		if (!currentProject) return;

		// Check if user has enough storage
		const usedStorage = totalSize ?? 0;
		const currentTotal =
			usedStorage + acceptedFiles.reduce((acc, file) => acc + file.size, 0);

		if (currentTotal > MAX_STORAGE) {
			toast.error("Not enough storage space.", {
				description: "You do not have enough storage to upload these files.",
			});
			return;
		}

		setState({
			files: acceptedFiles,
			isOpen: true,
			type: "upload",
		});
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

	useEffect(() => {
		if (status !== "CanLoadMore") return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					void loadMore(10);
				}
			},
			{ threshold: 0.1 },
		);

		if (loaderRef.current) {
			observer.observe(loaderRef.current);
		}

		return () => observer.disconnect();
	}, [status, loadMore]);

	return (
		<div className="flex flex-col w-full h-full max-h-full overflow-hidden @container">
			<Controls
				open={open}
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				sourceType={source}
				setSourceType={setSource}
				sortOrder={sortOrder}
				setSortOrder={setSortOrder}
			/>

			{/* Gallery Content with Dropzone */}
			<div
				className="relative flex flex-col flex-1 overflow-hidden"
				{...getRootProps()}
			>
				<input {...getInputProps()} />

				{/* Drag & Drop Overlay */}
				<AnimatePresence>
					{isDragActive && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="absolute inset-0 z-50 flex flex-col items-center justify-center text-white bg-background/95 backdrop-blur-xs"
						>
							<div className="flex items-center justify-center p-4 mb-4 border rounded-full bg-muted">
								<Upload className="size-8 animate-pulse" />
							</div>
							<div className="text-center text-white">
								<p className="text-lg font-bold">Drop media here to upload</p>
								<p className="max-w-xs mt-1 text-xs">
									Supported formats: PNG, JPG, JPEG, WebP, GIF, MP4, WebM, MP3,
									WAV and up to 5 files at a time.
								</p>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Scrollable Content */}
				<div
					onDoubleClick={(e) => {
						e.stopPropagation();
						setSelected([]);
					}}
					className="flex-1 p-4 overflow-y-auto select-none"
				>
					{status === "LoadingFirstPage" ? (
						<div className="grid grid-cols-6 gap-8">
							{Array.from({ length: 8 }).map((_, index) => (
								<Skeleton
									// biome-ignore lint/suspicious/noArrayIndexKey: Loading skeleton, index is fine
									key={index}
									className="w-full col-span-1 rounded-md aspect-square"
								/>
							))}
						</div>
					) : mediaItems.length === 0 ? (
						<div
							className={cn(
								"flex items-center justify-center h-full transition-opacity duration-300 ease-in-out",
								isDragActive ? "opacity-0" : "opacity-100",
							)}
						>
							<p className="text-sm text-center text-muted-foreground">
								No images found. Upload an image to get started.
							</p>
						</div>
					) : (
						<div className="grid grid-cols-6 gap-8">
							{mediaItems.map((media) => (
								<MediaItem
									key={media._id}
									media={media}
									selected={selected}
									setSelected={setSelected}
								/>
							))}
						</div>
					)}
					{status === "CanLoadMore" && (
						<div ref={loaderRef} className="flex justify-center w-full p-4">
							<Spinner size="xs" />
						</div>
					)}
					{status === "LoadingMore" && (
						<div className="flex items-center justify-center w-full h-24">
							<Spinner size="xs" />
						</div>
					)}
				</div>
			</div>

			<Footer
				totalCount={totalCount ?? 0}
				currentCount={mediaItems.length}
				status={status}
			/>

			<SelectedMenu
				selections={selected}
				setSelections={setSelected}
				totalCount={totalCount ?? 0}
			/>

			<MediaDetailsModal />
			<NewMediaModal />

			<AIImageModal />

			<MediaGalleryModal />
		</div>
	);
};
