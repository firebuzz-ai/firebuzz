"use client";
import { useProject } from "@/hooks/auth/use-project";
import type { Id } from "@firebuzz/convex";
import {
	api,
	type Doc,
	useCachedQuery,
	usePaginatedQuery,
} from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	AlertCircle,
	Check,
	FileAudio,
	FileVideo,
	Search,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

// Define expected structure for onSelect based on usage
interface SelectedMediaItem {
	id: Id<"media">;
	url: string;
	key: string;
	fileName: string;
	type: "image" | "video" | "audio";
	contentType: string;
	description: string;
	size: number;
}

interface GalleryTabProps {
	onSelect: (media: SelectedMediaItem[]) => void;
	allowedTypes: ("image" | "video" | "audio")[];
	allowMultiple: boolean;
	maxFiles: number;
	setIsOpen: (isOpen: boolean) => void;
}

export const GalleryTab = ({
	onSelect,
	allowedTypes,
	allowMultiple,
	maxFiles,
	setIsOpen,
}: GalleryTabProps) => {
	const { currentProject } = useProject();
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
	const [selectedMedia, setSelectedMedia] = useState<Doc<"media">[]>([]);
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
	const [selectedType, setSelectedType] = useState<
		"all" | "image" | "video" | "audio"
	>("all");

	const loaderRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const totalCount = useCachedQuery(
		api.collections.storage.media.queries.getTotalCount,
		currentProject ? { projectId: currentProject._id } : "skip",
	);

	const { results, status, loadMore } = usePaginatedQuery(
		api.collections.storage.media.queries.getPaginated,
		currentProject
			? {
					sortOrder: "desc",
					searchQuery: debouncedSearchQuery,
					type: selectedType !== "all" ? selectedType : undefined,
				}
			: "skip",
		{ initialNumItems: 12 },
	);

	const mediaItems = results ?? [];

	const handleSelect = () => {
		if (selectedMedia.length === 0) return;

		onSelect(
			selectedMedia.map((media) => ({
				id: media._id,
				url: `${NEXT_PUBLIC_R2_PUBLIC_URL}/${media.key}`,
				key: media.key,
				fileName: media.name,
				type: media.type,
				contentType: media.contentType,
				description: "", // Add description if available, otherwise empty
				size: media.size,
			})),
		);

		setIsOpen(false);
		setSelectedMedia([]);
	};

	const isMediaTypeAllowed = (mediaType: "image" | "video" | "audio") => {
		return allowedTypes.includes(mediaType);
	};

	const toggleMediaSelection = (media: Doc<"media">) => {
		if (!isMediaTypeAllowed(media.type)) {
			toast.error("Selection not allowed", {
				description: `${media.type.charAt(0).toUpperCase() + media.type.slice(1)} selection is not allowed for this operation.`,
				icon: <AlertCircle className="size-4" />,
			});
			return;
		}

		setSelectedMedia((prev) => {
			const isSelected = prev.some((m) => m._id === media._id);

			if (allowMultiple) {
				if (isSelected) {
					return prev.filter((m) => m._id !== media._id);
				}
				if (prev.length < maxFiles) {
					return [...prev, media];
				}

				toast.info(`You can select up to ${maxFiles} files.`);
				return prev; // Exceeded max files
			}
			// Single selection mode (no else needed)
			return isSelected ? [] : [media];
		});
	};

	const isMediaSelected = (mediaId: string) => {
		return selectedMedia.some((media) => media._id === mediaId);
	};

	// Intersection observer for infinite scrolling
	useEffect(() => {
		const currentLoaderRef = loaderRef.current;
		if (status !== "CanLoadMore" || !currentLoaderRef) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					void loadMore(12);
				}
			},
			{
				threshold: 0.1,
				root: scrollContainerRef.current, // Use scroll container as root
			},
		);

		observer.observe(currentLoaderRef);

		return () => {
			observer.disconnect();
		};
	}, [status, loadMore]);

	// On first load or when there's a type/search change and we're in CanLoadMore state,
	// check if we need to load more content (if container isn't filled)
	// biome-ignore lint/correctness/useExhaustiveDependencies: <We need to re-run this effect when the media items change>
	useLayoutEffect(() => {
		if (
			status === "CanLoadMore" &&
			scrollContainerRef.current &&
			loaderRef.current
		) {
			const container = scrollContainerRef.current;
			const hasRoomToScroll = container.scrollHeight <= container.clientHeight;

			if (hasRoomToScroll) {
				void loadMore(12);
			}
		}
	}, [status, loadMore, mediaItems]); // Rerun if mediaItems change, indicating potential new load

	// Filter options, dynamically disable based on allowedTypes
	const filterOptions = [
		{ value: "all", label: "All Types", disabled: false },
		{
			value: "image",
			label: "Images",
			disabled: !allowedTypes.includes("image"),
		},
		{
			value: "video",
			label: "Videos",
			disabled: !allowedTypes.includes("video"),
		},
		{
			value: "audio",
			label: "Audio",
			disabled: !allowedTypes.includes("audio"),
		},
	];

	return (
		<div className="flex flex-col h-full">
			{/* Filters */}
			<div className="flex gap-2 items-center px-4 pt-4 pb-2">
				<div className="relative flex-1">
					<Search className="absolute left-2.5 top-2.5 !size-3 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Search media..."
						className="pl-7 h-8"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<Select
					value={selectedType}
					onValueChange={(value) =>
						setSelectedType(value as "all" | "image" | "video" | "audio")
					}
				>
					<SelectTrigger className="w-[140px] h-8">
						<SelectValue placeholder="Filter by type" />
					</SelectTrigger>
					<SelectContent>
						{filterOptions.map((option) => (
							<SelectItem
								key={option.value}
								value={option.value}
								disabled={option.disabled}
							>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Media Grid with Infinite Scroll */}
			<div
				ref={scrollContainerRef}
				className="overflow-y-auto flex-1 px-4 pt-4 pb-4 h-full"
			>
				{status === "LoadingFirstPage" ? (
					<div className="flex justify-center items-center h-full">
						<Spinner size="sm" />
					</div>
				) : mediaItems.length === 0 ? (
					<div className="flex justify-center items-center h-full">
						<p className="text-sm text-muted-foreground">
							{debouncedSearchQuery || selectedType !== "all"
								? "No media found matching your criteria."
								: "No media found in your gallery."}
						</p>
					</div>
				) : (
					<div className="grid grid-cols-3 gap-4">
						{mediaItems.map((media) => (
							<MediaItemSelector
								key={media._id}
								media={media}
								isSelected={isMediaSelected(media._id)}
								isAllowed={isMediaTypeAllowed(media.type)}
								onSelect={() => toggleMediaSelection(media)}
							/>
						))}
						{status === "CanLoadMore" && (
							<div
								ref={loaderRef}
								className="flex col-span-3 justify-center p-4 w-full"
							>
								<Spinner size="xs" />
							</div>
						)}
						{status === "LoadingMore" && (
							<div className="flex col-span-3 justify-center items-center w-full h-12">
								<Spinner size="xs" />
							</div>
						)}
					</div>
				)}
			</div>

			{/* Footer with Action Button */}
			<div className="flex justify-between items-center px-4 py-2 border-t border-border">
				<div className="text-xs text-muted-foreground">
					{`${mediaItems.length} of ${totalCount ?? 0} loaded`}
				</div>
				<Button
					size="sm"
					onClick={handleSelect}
					disabled={selectedMedia.length === 0}
				>
					Select {selectedMedia.length > 0 ? `(${selectedMedia.length})` : ""}
				</Button>
			</div>
		</div>
	);
};

// Media Item Component (Internal to GalleryTab)
const MediaItemSelector = ({
	media,
	isSelected,
	isAllowed,
	onSelect,
}: {
	media: Doc<"media">;
	isSelected: boolean;
	isAllowed: boolean;
	onSelect: () => void;
}) => {
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

	return (
		<div
			onClick={onSelect}
			className={cn(
				"relative aspect-square rounded-md border overflow-hidden cursor-pointer transition-all",
				isSelected ? "ring-2 ring-brand" : "border-border",
				!isAllowed && "opacity-50 cursor-not-allowed",
				isAllowed && "hover:ring-2 hover:ring-brand",
			)}
		>
			{media.type === "image" ? (
				<Image
					unoptimized
					src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${media.key}`}
					alt={media.name}
					fill
					className="object-cover rounded-md"
					priority={false}
				/>
			) : media.type === "video" ? (
				<div className="flex justify-center items-center w-full h-full bg-background-subtle">
					<FileVideo className="size-10 text-muted-foreground" />
				</div>
			) : (
				<div className="flex justify-center items-center w-full h-full bg-background-subtle">
					<FileAudio className="size-10 text-muted-foreground" />
				</div>
			)}

			{isSelected && (
				<div className="absolute top-2 right-2 p-1 text-white rounded-full bg-brand">
					<Check className="size-3" />
				</div>
			)}

			{/* Selected Overlay */}
			{isSelected && <div className="absolute inset-0 bg-brand/20" />}

			{/* Not Allowed Indicator */}
			{!isAllowed && (
				<div className="absolute top-2 right-2 p-1 text-white rounded-full bg-destructive">
					<AlertCircle className="size-3" />
				</div>
			)}

			<div className="absolute right-0 bottom-0 left-0 p-2 text-xs truncate rounded-b-md backdrop-blur-sm bg-background/80">
				{media.name}
			</div>
		</div>
	);
};
