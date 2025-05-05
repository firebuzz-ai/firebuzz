"use client";

import { useProject } from "@/hooks/auth/use-project";
import { api, useMutation, useUploadFile } from "@firebuzz/convex";
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
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { AlertCircle, Check, Filter, Search } from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { useInfiniteQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

// Define expected structure for onSelect based on usage
interface SelectedMediaItem {
  url: string;
  key: string;
  fileName: string;
  type: "image" | "video" | "audio";
  contentType: string;
  description: string;
  size: number;
}

interface UnsplashTabProps {
  onSelect: (media: SelectedMediaItem[]) => void;
  allowedTypes: ("image" | "video" | "audio")[];
  allowMultiple: boolean;
  maxFiles: number;
  setIsOpen: (isOpen: boolean) => void;
}

// Types from original unsplash component
interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string;
  width: number;
  height: number;
  user: {
    name: string;
    username: string;
  };
}

interface UnsplashResponse {
  type: string;
  status: number;
  response: {
    results: UnsplashImage[];
    total: number;
    total_pages: number;
  };
}

export const UnsplashTab = ({
  onSelect,
  allowedTypes,
  allowMultiple,
  maxFiles,
  setIsOpen,
}: UnsplashTabProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [orientation, setOrientation] = useState<
    "landscape" | "portrait" | "squarish"
  >("landscape");
  const [debouncedQuery] = useDebounce(searchQuery, 500);
  const [selectedImages, setSelectedImages] = useState<UnsplashImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { currentProject } = useProject();
  const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

  const uploadFile = useUploadFile(api.helpers.r2);
  const createMedia = useMutation(
    api.collections.storage.media.mutations.create
  );

  // Unsplash only supports images
  const isImageAllowed = allowedTypes.includes("image");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["unsplash", debouncedQuery, orientation],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        query: debouncedQuery,
        page: String(pageParam),
        per_page: "12", // Fetch 12 per page
        orientation,
      });
      const res = await fetch(`/api/unsplash?${params}`);
      if (!res.ok) {
        throw new Error("Failed to fetch images from Unsplash");
      }
      return res.json() as Promise<UnsplashResponse>;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (
        lastPage.response?.results?.length < 12 ||
        pages.length >= lastPage.response?.total_pages
      ) {
        return undefined;
      }
      return pages.length + 1;
    },
    retry: 1,
    retryDelay: 1000,
    enabled: !!debouncedQuery && isImageAllowed, // Only fetch if query exists and images are allowed
  });

  const loaderRef = useRef<HTMLDivElement>(null);

  const allImages = useMemo(() => {
    if (!data?.pages) return [];
    const flatResults = data.pages.flatMap(
      (page) => page.response?.results ?? []
    );
    // Deduplicate based on ID
    const uniqueImages = Array.from(
      new Map(flatResults.map((img) => [img.id, img])).values()
    );
    return uniqueImages;
  }, [data?.pages]);

  const currentMaxFiles = allowMultiple ? maxFiles : 1;

  const toggleSelectionHandler = (image: UnsplashImage) => {
    if (!isImageAllowed) {
      toast.error("Image selection not allowed for this operation.", {
        icon: <AlertCircle className="size-4" />,
      });
      return;
    }

    setSelectedImages((prev) => {
      const isSelected = prev.some((i) => i.id === image.id);

      if (allowMultiple) {
        if (isSelected) {
          return prev.filter((i) => i.id !== image.id);
        }
        if (prev.length < currentMaxFiles) {
          return [...prev, image];
        }
        toast.info(
          `You can select up to ${currentMaxFiles} image${currentMaxFiles > 1 ? "s" : ""}.`
        );
        return prev; // Limit reached
      }
      // Single selection mode
      return isSelected ? [] : [image];
    });
  };

  const handleSelectAndProcess = async () => {
    if (!currentProject || selectedImages.length === 0 || !isImageAllowed)
      return;

    setIsProcessing(true);

    const processPromises = selectedImages.map(async (image) => {
      try {
        // Fetch the image blob from Unsplash
        const response = await fetch(image.urls.raw); // Use raw for best quality
        if (!response.ok)
          throw new Error(`Failed to download image: ${image.id}`);
        const blob = await response.blob();
        const fileName = `unsplash-${image.id}.jpg`;
        const file = new File([blob], fileName, { type: "image/jpeg" });

        // Upload to R2
        const key = await uploadFile(file);

        // Create Convex media document
        await createMedia({
          key,
          name: fileName,
          type: "image",
          contentType: "image/jpeg",
          size: blob.size,
          source: "unsplash",
          // Add width/height if your schema supports it
          // width: image.width,
          // height: image.height,
        });

        // Return data needed for onSelect
        return {
          url: `${NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`,
          key,
          fileName,
          type: "image",
          contentType: "image/jpeg",
          description: image.alt_description || "",
          size: blob.size,
        } as SelectedMediaItem;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : `Failed to process image ${image.id}`
        );
        return null;
      }
    });

    const results = await Promise.all(processPromises);
    const successfulItems = results.filter(
      (item): item is SelectedMediaItem => item !== null
    );

    setIsProcessing(false);

    if (successfulItems.length > 0) {
      toast.success(
        `${successfulItems.length} image${successfulItems.length > 1 ? "s" : ""} processed and added to gallery.`
      );
      onSelect(successfulItems);
      setIsOpen(false);
      setSelectedImages([]); // Clear selection
    } else {
      toast.error("Failed to process selected images.");
    }
  };

  // Infinite scroll observer
  useEffect(() => {
    const currentLoaderRef = loaderRef.current;
    if (!currentLoaderRef || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentLoaderRef);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="relative flex flex-col w-full h-full max-h-full overflow-hidden">
      {/* Controls */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 !size-3 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search Unsplash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-7"
            disabled={!isImageAllowed || isProcessing} // Disable input if images not allowed or processing
          />
        </div>

        <Select
          value={orientation}
          onValueChange={(value) => setOrientation(value as typeof orientation)}
          disabled={!isImageAllowed || isProcessing}
        >
          <SelectTrigger className="w-40 h-8">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="landscape">Landscape</SelectItem>
            <SelectItem value="portrait">Portrait</SelectItem>
            <SelectItem value="squarish">Square</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!isImageAllowed ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-center text-muted-foreground">
            Image selection is not allowed.
          </p>
        </div>
      ) : (
        <>
          {/* Gallery Content */}
          <div className="h-full max-h-full px-4 pb-4 overflow-y-auto">
            {status === "pending" && debouncedQuery ? (
              <div className="grid grid-cols-3 gap-4 mt-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton
                    // biome-ignore lint/suspicious/noArrayIndexKey: Loading skeleton
                    key={index}
                    className="w-full col-span-1 rounded-md h-28 aspect-square"
                  />
                ))}
              </div>
            ) : allImages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-center text-muted-foreground">
                  {debouncedQuery
                    ? "No images found"
                    : "Search for images on Unsplash"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 mt-4">
                {allImages.map((image) => {
                  if (!image?.urls) return null;
                  const isSelected = selectedImages.some(
                    (selected) => selected.id === image.id
                  );
                  return (
                    <div key={image.id} className="flex flex-col gap-2">
                      <div
                        onClick={() =>
                          !isProcessing && toggleSelectionHandler(image)
                        } // Disable click during processing
                        className={cn(
                          "relative object-cover w-full overflow-hidden transition-opacity border rounded-md cursor-pointer aspect-square border-border",
                          isSelected ? "ring-2 ring-brand" : "",
                          isProcessing
                            ? "opacity-50 cursor-wait"
                            : "hover:opacity-80"
                        )}
                      >
                        <Image
                          unoptimized // Unsplash provides optimized URLs
                          src={image.urls.small} // Use small for grid view
                          alt={image.alt_description || "Unsplash image"}
                          fill
                          className="object-cover w-full h-full rounded-md"
                          sizes="(max-width: 768px) 33vw, 25vw" // Optimize image loading
                        />
                        {isSelected && (
                          <div className="absolute p-1 text-white rounded-full top-2 right-2 bg-brand">
                            <Check className="size-3" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-brand/20" />
                        )}
                      </div>
                      {/* Author */}
                      <a
                        href={`https://unsplash.com/@${image.user.username}?utm_source=your_app_name&utm_medium=referral`} // Add UTM source
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-xs text-muted-foreground hover:underline"
                      >
                        By {image.user.name}
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
            {(hasNextPage || isFetchingNextPage) && (
              <div ref={loaderRef} className="flex justify-center w-full p-4">
                <Spinner size="xs" />
              </div>
            )}
          </div>

          {/* Footer with Action Button */}
          <div className="flex items-center justify-between px-4 py-2 mt-auto border-t border-border">
            <div className="text-xs text-muted-foreground">
              {`${allImages.length} images loaded`}{" "}
              {isFetching && !isFetchingNextPage ? "(Loading...)" : ""}
            </div>
            <Button
              size="sm"
              onClick={handleSelectAndProcess}
              disabled={selectedImages.length === 0 || isProcessing}
            >
              {isProcessing ? <Spinner size="xs" className="mr-2" /> : null}
              {isProcessing
                ? "Processing..."
                : `Select ${selectedImages.length > 0 ? `(${selectedImages.length})` : ""}`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
