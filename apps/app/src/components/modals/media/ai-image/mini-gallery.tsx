import { Footer } from "@/app/(workspace)/(dashboard)/storage/media/_components/media-list/footer";
import { useProject } from "@/hooks/auth/use-project";
import { useAIImageModal } from "@/hooks/ui/use-ai-image-modal";
import {
  type Doc,
  api,
  useCachedQuery,
  usePaginatedQuery,
} from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { cn } from "@firebuzz/ui/lib/utils";
import Image from "next/image";
import { parseAsString, useQueryState } from "nuqs";
import React, { useRef } from "react";

interface MiniGalleryImageProps {
  media: Doc<"media">;
  isSelected: boolean;
  handleSelect: (id: string) => void;
}

const MiniGalleryImage = ({
  media,
  isSelected,
  handleSelect,
}: MiniGalleryImageProps) => {
  const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
  const mediaUrl = `${NEXT_PUBLIC_R2_PUBLIC_URL}/${media.key}`;
  return (
    <button
      type="button"
      onClick={() => handleSelect(media.key)}
      className={cn(
        "relative flex flex-col items-center justify-center w-full aspect-square rounded-md border border-border overflow-hidden transition-colors duration-100 ease-in-out focus:outline-none",
        isSelected
          ? "border-brand ring-2 ring-brand"
          : "hover:border-muted-foreground"
      )}
      aria-label={media.name}
    >
      <Image
        unoptimized
        src={mediaUrl}
        alt={media.name}
        fill
        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw"
        className="object-cover"
        priority={false}
      />
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none bg-brand/10" />
      )}
    </button>
  );
};

export const MiniGallery = () => {
  const { currentProject } = useProject();
  const { selectedImage, setSelectedImage } = useAIImageModal();
  const [search, setSearch] = useQueryState(
    "mini-gallery-search",
    parseAsString.withDefault("")
  );
  const loaderRef = useRef<HTMLDivElement>(null);

  // Only fetch images
  const {
    results: mediaItems,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.collections.storage.media.queries.getPaginated,
    {
      sortOrder: "desc",
      searchQuery: search,
      type: "image",
    },
    { initialNumItems: 10 }
  );

  const totalCount = useCachedQuery(
    api.collections.storage.media.queries.getTotalCount,
    currentProject ? { projectId: currentProject._id } : "skip"
  );

  // Infinite scroll
  React.useEffect(() => {
    if (status !== "CanLoadMore") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore(10);
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [status, loadMore]);

  const handleSelect = (id: string) => {
    const isSelected = selectedImage === id;
    const selectedImageData = mediaItems.find((media) => media.key === id);
    setSelectedImage(
      isSelected ? undefined : id,
      selectedImageData?.aiMetadata?.quality as
        | "low"
        | "medium"
        | "high"
        | undefined,
      selectedImageData?.aiMetadata?.size as
        | "1024x1024"
        | "1536x1024"
        | "1024x1536"
        | "auto"
        | undefined,
      selectedImageData?.aiMetadata?.prompt
    );
  };

  return (
    <div className="flex flex-col w-full h-full max-h-full col-span-3 overflow-hidden border-l">
      {/* Header */}
      <div className="px-4 pt-3.5">
        <h3 className="text-sm font-medium">Gallery</h3>
      </div>
      {/* Search */}
      <div className="px-4 py-3 border-b">
        <Input
          type="search"
          className="h-8"
          placeholder="Search images..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="h-full max-h-full px-4 py-2 overflow-y-auto">
        {status === "LoadingFirstPage" ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={`skeleton-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  i
                }`}
                className="w-full aspect-square"
              />
            ))}
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No images found.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {mediaItems.map((media) => (
              <MiniGalleryImage
                key={media._id}
                media={media}
                isSelected={selectedImage === media.key}
                handleSelect={handleSelect}
              />
            ))}
            {status === "CanLoadMore" && (
              <div
                ref={loaderRef}
                className="flex justify-center col-span-2 p-2"
              >
                <Spinner size="xs" />
              </div>
            )}
            {status === "LoadingMore" && (
              <div className="flex items-center justify-center h-12 col-span-2">
                <Spinner size="xs" />
              </div>
            )}
          </div>
        )}
      </div>
      <Footer
        totalCount={
          status === "Exhausted" ? mediaItems.length : (totalCount ?? 0)
        }
        currentCount={mediaItems.length}
        status={status}
      />
    </div>
  );
};
