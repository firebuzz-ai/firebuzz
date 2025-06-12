import { useMutation, useUploadFile } from "@firebuzz/convex";
import { api } from "@firebuzz/convex/nextjs";
import { envCloudflarePublic } from "@firebuzz/env";
import { TextShimmer } from "@firebuzz/ui/components/reusable/text-shimmer";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { parseMediaFile } from "@firebuzz/utils";
import type { Message, ToolInvocation } from "ai";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { memo, useMemo, useState } from "react";

interface ToolCallProps {
  toolCall: ToolInvocation;
  message: Message;
  addToolResult: ({
    toolCallId,
    result,
  }: {
    toolCallId: string;
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    result: any;
  }) => void;
}

interface AskImageConfirmationSharedProps {
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
  status: ToolInvocation["state"];
}

const AskImageConfirmationPartial = memo(
  ({ isExpanded, setIsExpanded }: AskImageConfirmationSharedProps) => {
    return (
      <>
        <div
          className={cn(
            "flex items-center justify-between px-3 py-2 bg-muted/30",
            { "border-b": isExpanded }
          )}
        >
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-6 h-6 p-0"
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  <Skeleton className="aspect-square" />
                  <Skeleton className="aspect-square" />
                  <Skeleton className="aspect-square" />
                  <Skeleton className="aspect-square" />
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Skeleton className="w-24 h-8" />
                  <Skeleton className="w-24 h-8" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }
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
  setSelectedImages: (images: string[]) => void;
  status: ToolInvocation["state"];
}

const AskImageConfirmationContent = memo(
  ({
    toolCallId,
    isExpanded,
    setIsExpanded,
    images,
    selectedImages,
    toggleImage,
    uploadedUrls,
    isUploading,
    uploadImages,
    status,
    setSelectedImages,
  }: AskImageConfirmationContentProps) => {
    return (
      <>
        <div
          className={cn(
            "flex items-center justify-between px-3 py-2 bg-muted/30",
            { "border-b": isExpanded }
          )}
        >
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-6 h-6 p-0"
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {images?.map((image) => (
                    <div
                      key={`${image.id}-${toolCallId}`}
                      className={cn(
                        "relative aspect-square overflow-hidden rounded-md border cursor-pointer group",
                        selectedImages.includes(image.id) &&
                          "ring-2 ring-brand",
                        !selectedImages.includes(image.id) &&
                          status === "result" &&
                          "grayscale"
                      )}
                      onClick={() => toggleImage(image.id)}
                    >
                      <Image
                        unoptimized
                        src={image.url}
                        alt={image.altText || `Image ${image.id}`}
                        fill
                        className="object-cover transition-all group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                      {selectedImages.includes(image.id) && (
                        <div className="absolute p-1 rounded-full top-2 right-2 bg-brand text-brand-foreground">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {status !== "result" && (
                  <div className="flex justify-end gap-2 mt-4">
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
                        isUploading ||
                        Object.keys(uploadedUrls).length > 0
                      }
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Selecting...
                        </>
                      ) : (
                        `Select ${selectedImages.length > 1 ? `(${selectedImages.length})` : ""}`
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }
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
      selectedIdsFromResult
    );
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedUrls, setUploadedUrls] = useState<Record<string, string>>(
      {}
    );

    const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
    const uploadFile = useUploadFile(api.components.r2);
    const createMedia = useMutation(
      api.collections.storage.media.mutations.create
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
      setSelectedImages((prev) =>
        prev.includes(imageId)
          ? prev.filter((id) => id !== imageId)
          : [...prev, imageId]
      );
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
            `Successfully uploaded ${successfulUploads.length} images`
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
      <div className="mb-4 overflow-hidden border rounded-md">
        {status === "partial-call" ? (
          <AskImageConfirmationPartial
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
            status={status}
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
          />
        )}
      </div>
    );
  }
);
