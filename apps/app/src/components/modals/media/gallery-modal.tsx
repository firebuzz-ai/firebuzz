import { useProject } from "@/hooks/auth/use-project";
import { useMediaGalleryModal } from "@/hooks/ui/use-media-gallery-modal";
import {
  type Doc,
  api,
  useCachedQuery,
  usePaginatedQuery,
} from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@firebuzz/ui/components/ui/dialog";
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
import { useHotkeys } from "react-hotkeys-hook";
import { useDebounce } from "use-debounce";

export const MediaGalleryModal = ({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) => {
  const { isOpen, setIsOpen, allowedTypes, onSelect, allowMultiple, maxFiles } =
    useMediaGalleryModal();
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
  const [isObserverSetup, setIsObserverSetup] = useState(false);

  useHotkeys("esc", () => setIsOpen(false));

  const totalCount = useCachedQuery(
    api.collections.storage.media.queries.getTotalCount,
    currentProject ? { projectId: currentProject._id } : "skip"
  );

  const {
    results: mediaItems,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.collections.storage.media.queries.getPaginated,
    {
      sortOrder: "desc",
      searchQuery: debouncedSearchQuery,
      type: selectedType !== "all" ? selectedType : undefined,
    },
    { initialNumItems: 12 }
  );

  const handleSelect = () => {
    if (selectedMedia.length === 0) return;

    onSelect(
      selectedMedia.map((media) => ({
        url: `${NEXT_PUBLIC_R2_PUBLIC_URL}/${media.key}`,
        fileName: media.name,
        type: media.type,
        contentType: media.contentType,
        description: "",
        size: media.size,
      }))
    );

    setIsOpen(false);
    setSelectedMedia([]);
  };

  const handleCancel = () => {
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

    setSelectedMedia(
      allowMultiple
        ? (prev) =>
            prev.includes(media)
              ? prev.filter((m) => m._id !== media._id)
              : [...prev, media].length > maxFiles
                ? prev
                : [...prev, media]
        : () => [media]
    );
  };

  const isMediaSelected = (mediaId: string) => {
    return selectedMedia.some((media) => media._id === mediaId);
  };

  // This effect tracks when the modal is opened and ensures observer is setup after DOM is ready
  useEffect(() => {
    if (isOpen) {
      // Ensure observer is setup after the modal content is rendered
      const timer = setTimeout(() => {
        setIsObserverSetup(true);
      }, 300); // Short delay to ensure content is rendered

      return () => {
        clearTimeout(timer);
        setIsObserverSetup(false);
      };
    }
  }, [isOpen]);

  // Intersection observer for infinite scrolling
  useEffect(() => {
    if (!isObserverSetup || status !== "CanLoadMore" || !loaderRef.current)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore(12);
        }
      },
      {
        threshold: 0.1,
        root: scrollContainerRef.current,
      }
    );

    observer.observe(loaderRef.current);

    return () => {
      observer.disconnect();
    };
  }, [status, loadMore, isObserverSetup]);

  // On first load or when there's a type/search change and we're in CanLoadMore state,
  // check if we need to load more content (if container isn't filled)
  useLayoutEffect(() => {
    if (
      status === "CanLoadMore" &&
      scrollContainerRef.current &&
      loaderRef.current
    ) {
      // Check if the scroll container has room to scroll
      const container = scrollContainerRef.current;
      const hasRoomToScroll = container.scrollHeight <= container.clientHeight;

      // If we have no scroll room and we're in CanLoadMore state,
      // we likely need to load more content
      if (hasRoomToScroll) {
        void loadMore(12);
      }
    }
  }, [status, loadMore]);

  // All possible media types for filtering
  const filterOptions = [
    { value: "all", label: "All Types" },
    { value: "image", label: "Images" },
    { value: "video", label: "Videos" },
    { value: "audio", label: "Audio" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild={asChild}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] h-[600px] flex flex-col !gap-0 !p-0">
        <DialogHeader className="px-4 py-4 border-b">
          <DialogTitle>Select Media</DialogTitle>
          <DialogDescription>
            Search for media by name or description.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center px-4 pt-4 pb-2 space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 !size-3 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search media..."
              className="h-8 pl-7"
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
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Media Grid with Infinite Scroll */}
        <div
          ref={scrollContainerRef}
          className="h-full px-4 pt-2 pb-4 overflow-y-auto"
        >
          {status === "LoadingFirstPage" ? (
            <div className="flex items-center justify-center h-full">
              <Spinner size="sm" />
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">No media found.</p>
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
                  className="flex justify-center w-full col-span-3 p-4"
                >
                  <Spinner size="xs" />
                </div>
              )}
              {status === "LoadingMore" && (
                <div className="flex items-center justify-center w-full h-12 col-span-3">
                  <Spinner size="xs" />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-4 py-4 border-t border-border">
          <div className="flex items-center justify-between flex-1 max-h-min shrink-0">
            <div className="flex items-center justify-between w-full gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                {`${mediaItems.length} of ${totalCount ?? 0} loaded`}
              </div>
              {/* Buttons */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSelect}
                  disabled={selectedMedia.length === 0}
                >
                  Select
                </Button>
              </div>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Simplified MediaItem component for the modal
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
        isSelected
          ? "border-2 border-brand ring-2 ring-brand/20"
          : "border-border",
        !isAllowed && "opacity-50 cursor-not-allowed",
        isAllowed && "hover:border-brand/50"
      )}
    >
      {media.type === "image" ? (
        <Image
          unoptimized
          src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${media.key}`}
          alt={media.name}
          fill
          sizes="(max-width: 768px) 33vw, (max-width: 1200px) 16vw"
          className="object-cover"
          priority={false}
        />
      ) : media.type === "video" ? (
        <div className="flex items-center justify-center w-full h-full bg-background-subtle">
          <FileVideo className="size-10 text-muted-foreground" />
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-background-subtle">
          <FileAudio className="size-10 text-muted-foreground" />
        </div>
      )}

      {isSelected && (
        <div className="absolute p-1 text-white rounded-full top-2 right-2 bg-brand">
          <Check className="size-3" />
        </div>
      )}

      {/* Selected Overlay */}
      {isSelected && <div className="absolute inset-0 bg-brand/20" />}

      {/* Not Allowed Indicator */}
      {!isAllowed && (
        <div className="absolute p-1 text-white rounded-full top-2 right-2 bg-destructive">
          <AlertCircle className="size-3" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2 text-xs truncate bg-background/80 backdrop-blur-sm">
        {media.name}
      </div>
    </div>
  );
};
