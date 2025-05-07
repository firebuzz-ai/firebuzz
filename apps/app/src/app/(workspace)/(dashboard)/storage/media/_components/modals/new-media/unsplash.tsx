import { useNewMediaModal } from "@/app/(workspace)/(dashboard)/storage/media/_components/modals/new-media/use-new-media-modal";
import { useProject } from "@/hooks/auth/use-project";
import { api, useMutation, useUploadFile } from "@firebuzz/convex";
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
import { Check, Filter, Upload } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

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

export const Unsplash = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [orientation, setOrientation] = useState<
    "landscape" | "portrait" | "squarish"
  >("landscape");
  const [debouncedQuery] = useDebounce(searchQuery, 500);
  const [selectedImages, setSelectedImages] = useState<UnsplashImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { setIsOpen } = useNewMediaModal();
  const { currentProject } = useProject();

  const uploadFile = useUploadFile(api.helpers.r2);
  const createMedia = useMutation(
    api.collections.storage.media.mutations.create
  );

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
        orientation,
      });
      const res = await fetch(`/api/unsplash?${params}`);
      if (!res.ok) {
        throw new Error("Failed to fetch images");
      }
      return res.json() as Promise<UnsplashResponse>;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.response?.results?.length < 10) {
        return undefined;
      }
      return pages.length + 1;
    },

    retry: 1,
    retryDelay: 1000,
    enabled: !!debouncedQuery,
  });

  const loaderRef = useRef<HTMLDivElement>(null);

  // Memoize the flattened and deduplicated images array
  const allImages = useMemo(() => {
    if (!data?.pages) return [];

    const allImagesFlatNotUnique = data.pages.flatMap(
      (page) => page.response.results
    );

    const uniqueIDs = new Set(allImagesFlatNotUnique.map((image) => image?.id));

    return allImagesFlatNotUnique.filter((image) => uniqueIDs.has(image?.id));
  }, [data?.pages]);

  const selectHandler = (image: UnsplashImage) => {
    const isAlreadySelected = selectedImages.some((i) => i.id === image.id);
    if (isAlreadySelected) {
      setSelectedImages((prev) => prev.filter((i) => i.id !== image.id));
    } else {
      if (selectedImages.length >= 5) {
        toast.error("You can only select up to 5 images");
        return;
      }

      setSelectedImages((prev) => [...prev, image]);
    }
  };

  const uploadHandler = async () => {
    if (!currentProject || selectedImages.length === 0) return;

    setIsUploading(true);

    try {
      await Promise.all(
        selectedImages.map(async (image) => {
          try {
            // Download the image from Unsplash
            const response = await fetch(image.urls.raw);
            if (!response.ok) {
              throw new Error(`Failed to download image: ${image.id}`);
            }

            const blob = await response.blob();
            const fileName = `unsplash-${image.id}.jpg`;
            const file = new File([blob], fileName, { type: "image/jpeg" });

            // Upload to R2 storage
            const key = await uploadFile(file);

            // Create media record in database
            await createMedia({
              key,
              name: fileName,
              type: "image",
              contentType: "image/jpeg",
              size: blob.size,
              source: "unsplash",
            });
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to upload image from Unsplash"
            );
          }
        })
      );

      toast.success(`${selectedImages.length} images uploaded successfully`);

      // Clear state and close modal
      setSelectedImages([]);
      setIsUploading(false);
      setIsOpen(false);
    } catch (error) {
      setIsUploading(false);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload images"
      );
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          console.log("fetching next page");
          void fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="relative flex flex-col w-full h-full max-h-full pt-3 overflow-hidden">
      <div className="px-4 font-medium">
        Images{" "}
        <span className="text-sm text-muted-foreground">
          ({selectedImages.length})
        </span>
      </div>
      {/* Controls */}
      <div className="flex gap-2 px-4 pt-6 pb-4">
        <Input
          placeholder="Search Unsplash..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8"
        />
        <Select
          value={orientation}
          onValueChange={(value) => setOrientation(value as typeof orientation)}
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

      {/* Gallery Content */}
      <div className="h-full max-h-full px-4 pb-4 overflow-y-auto">
        {status === "pending" && debouncedQuery ? (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: Loading skeleton
                key={index}
                className="w-full col-span-1 row-span-1 rounded-md h-28"
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
          <div className="grid grid-cols-3 gap-4">
            {allImages.map((image) => {
              if (!image || !image.urls) return null;
              const isSelected = selectedImages.some(
                (selected) => selected.id === image.id
              );
              return (
                <div key={image.id} className="flex flex-col gap-2">
                  <div className="relative object-cover w-full h-auto overflow-hidden transition-opacity border rounded-md cursor-pointer hover:opacity-80 aspect-square border-border">
                    <img
                      src={image.urls.small}
                      alt={image.alt_description}
                      onClick={() => selectHandler(image)}
                      className="object-cover w-full h-full rounded-md"
                    />
                    {isSelected && (
                      <div className="absolute p-1 text-white rounded-full top-2 right-2 bg-brand">
                        <Check className="size-3" />
                      </div>
                    )}
                    {/* Selected Overlay */}
                    {isSelected && (
                      <div
                        onClick={() => selectHandler(image)}
                        className="absolute inset-0 bg-brand/20"
                      />
                    )}
                  </div>
                  {/* Author */}
                  <a
                    href={`https://unsplash.com/@${image.user.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-xs text-muted-foreground"
                  >
                    By {image.user.name}
                  </a>
                </div>
              );
            })}
          </div>
        )}
        {hasNextPage && (
          <div ref={loaderRef} className="flex justify-center w-full p-4">
            <Spinner size="xs" />
          </div>
        )}
      </div>

      {/* Selected Images */}
      <AnimatePresence>
        {selectedImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute left-0 right-0 flex items-center justify-center bottom-10"
          >
            <Button
              className="hover:bg-primary"
              size="sm"
              onClick={uploadHandler}
              disabled={isUploading}
            >
              {isUploading ? (
                <Spinner size="xs" className="mr-2" />
              ) : (
                <Upload className="mr-2 size-3" />
              )}
              {isUploading
                ? "Uploading..."
                : `Upload ${selectedImages.length} images`}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Footer */}
      <div className="flex items-center justify-between py-1.5 border-t border-border px-4">
        <div className="flex items-center justify-between w-full gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            {`${allImages.length} images loaded`}
          </div>
          <div className="text-xs text-muted-foreground/50">
            {isFetching
              ? "Loading..."
              : hasNextPage
                ? "Scroll down to load more"
                : "All images loaded"}
          </div>
        </div>
      </div>
    </div>
  );
};
