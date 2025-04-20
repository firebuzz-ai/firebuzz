import { useMutation, useUploadFile } from "@firebuzz/convex";
import { api } from "@firebuzz/convex/nextjs";
import { envCloudflarePublic } from "@firebuzz/env";
import { TextShimmer } from "@firebuzz/ui/components/reusable/text-shimmer";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { getFileType, getMediaContentType } from "@firebuzz/utils";
import type { ToolInvocation } from "ai";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";

interface ToolCallProps {
  toolCall: ToolInvocation;
  addToolResult: ({
    toolCallId,
    result,
  }: {
    toolCallId: string;
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    result: any;
  }) => void;
}

export const AskImageConfirmation = ({
  toolCall,
  addToolResult,
}: ToolCallProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<Record<string, string>>({});

  const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
  const uploadFile = useUploadFile(api.helpers.r2);
  const createMedia = useMutation(
    api.collections.storage.media.mutations.create
  );

  const status = toolCall.state;
  const images = toolCall.args.images as {
    id: string;
    width: number;
    height: number;
    url: string;
    altText: string;
    downloadLink: string;
  }[];

  const toggleImage = (imageId: string) => {
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
        const imageData = images.find((img) => img.id === imageId);
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
          const { type, extension } = getFileType(file);

          // Create media record
          if (type === "media") {
            const mediaType = getMediaContentType(file);
            await createMedia({
              key,
              type: mediaType,
              extension,
              size: file.size,
              name: file.name,
              source: "unsplash",
              aiMetadata: {
                size: `${imageData.width}x${imageData.height}`,
                prompt: imageData.altText || `Unsplash image ${imageData.id}`,
                seed: Date.now(),
              },
            });

            const cdnUrl = `${NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;
            uploadResults[imageId] = cdnUrl;
            successfulUploads.push(imageId);
          } else {
            failedUploads.push(imageId);
          }
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
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 bg-muted/30",
          { "border-b": isExpanded }
        )}
      >
        <div className="flex items-center gap-2">
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
            {toolCall.toolName}
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
                {images.map((image) => (
                  <div
                    key={image.id}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-md border cursor-pointer group",
                      selectedImages.includes(image.id) && "ring-2 ring-primary"
                    )}
                    onClick={() => toggleImage(image.id)}
                  >
                    <Image
                      src={image.url}
                      alt={image.altText || `Image ${image.id}`}
                      fill
                      className="object-cover transition-all group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    {selectedImages.includes(image.id) && (
                      <div className="absolute p-1 rounded-full top-2 right-2 bg-primary text-primary-foreground">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                    {uploadedUrls[image.id] && (
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs text-center bg-primary/70 text-primary-foreground">
                        Uploaded
                      </div>
                    )}
                  </div>
                ))}
              </div>

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
                    Object.keys(uploadedUrls).length > 0 ||
                    toolCall.state === "result"
                  }
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    `Upload ${selectedImages.length > 1 ? `(${selectedImages.length})` : ""}`
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
