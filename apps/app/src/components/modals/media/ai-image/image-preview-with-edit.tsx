import { useProject } from "@/hooks/auth/use-project";
import { useAIImageModal } from "@/hooks/ui/use-ai-image-modal";
import { api, useMutation, useUploadFile } from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import { Upload } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { parseMediaFile } from "@firebuzz/utils";
import { motion } from "motion/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { MaskCanvas } from "./mask-canvas";

interface ImagePreviewWithEditProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isMasking: boolean;
}

export const ImagePreviewWithEdit = ({
  canvasRef,
  isMasking,
}: ImagePreviewWithEditProps) => {
  const { selectedImage, setSelectedImage } = useAIImageModal();
  const { currentProject } = useProject();
  const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
  const uploadFile = useUploadFile(api.helpers.r2);
  const createMedia = useMutation(
    api.collections.storage.media.mutations.create
  );
  const [isUploading, setIsUploading] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [naturalImageSize, setNaturalImageSize] = useState({
    width: 0,
    height: 0,
  });
  const [renderedImageRect, setRenderedImageRect] = useState({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
  });

  const updateImageSizes = useCallback(() => {
    const container = imageContainerRef.current;
    const img = imageRef.current;

    if (container && img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNaturalImageSize({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      console.log(
        `Natural image size: ${img.naturalWidth}x${img.naturalHeight}`
      );

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const imgNaturalWidth = img.naturalWidth;
      const imgNaturalHeight = img.naturalHeight;

      const containerRatio = containerWidth / containerHeight;
      const imgRatio = imgNaturalWidth / imgNaturalHeight;

      let renderedWidth = 0;
      let renderedHeight = 0;
      let offsetX = 0;
      let offsetY = 0;

      if (imgRatio > containerRatio) {
        renderedWidth = containerWidth;
        renderedHeight = containerWidth / imgRatio;
        offsetX = 0;
        offsetY = (containerHeight - renderedHeight) / 2;
      } else {
        renderedHeight = containerHeight;
        renderedWidth = containerHeight * imgRatio;
        offsetY = 0;
        offsetX = (containerWidth - renderedWidth) / 2;
      }

      setRenderedImageRect({
        width: renderedWidth,
        height: renderedHeight,
        top: offsetY,
        left: offsetX,
      });
      console.log(
        `Rendered image rect: ${renderedWidth}x${renderedHeight} at ${offsetX},${offsetY}`
      );
    } else {
      setNaturalImageSize({ width: 0, height: 0 });
      setRenderedImageRect({ width: 0, height: 0, top: 0, left: 0 });
      console.log(
        "updateImageSizes: Container/image ref not ready or natural dimensions zero."
      );
    }
  }, []);

  useEffect(() => {
    if (!isMasking || !selectedImage) {
      setNaturalImageSize({ width: 0, height: 0 });
      setRenderedImageRect({ width: 0, height: 0, top: 0, left: 0 });
      return;
    }

    updateImageSizes();
    const timer = setTimeout(updateImageSizes, 50);
    window.addEventListener("resize", updateImageSizes);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateImageSizes);
    };
  }, [isMasking, selectedImage, updateImageSizes]);

  useEffect(() => {
    const imgElement = imageRef.current;
    if (!isMasking || !imgElement) return;

    const handleLoad = () => {
      updateImageSizes();
    };

    if (!imgElement.complete) {
      imgElement.addEventListener("load", handleLoad);
    } else {
      updateImageSizes();
    }

    return () => {
      imgElement.removeEventListener("load", handleLoad);
    };
  }, [isMasking, updateImageSizes]);

  const onDrop = async (acceptedFiles: File[]) => {
    if (!currentProject) {
      toast.error("No project context");
      return;
    }
    const file = acceptedFiles[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File exceeds 50MB size limit.");
      return;
    }
    setIsUploading(true);
    try {
      const key = await uploadFile(file);
      const { type, contentType } = parseMediaFile(file);
      await createMedia({
        key,
        name: file.name,
        type,
        contentType,
        size: file.size,
        source: "uploaded",
      });
      setSelectedImage(key);
      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };
  const onDropRejected = (_fileRejections: FileRejection[]) => {
    toast.error("File rejected. Please check the file type and size.");
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"] },
    maxSize: 50 * 1024 * 1024,
    maxFiles: 1,
    noClick: true,
    multiple: false,
    disabled: isUploading,
  });

  return (
    <div className="flex flex-col flex-1 max-h-full overflow-hidden">
      {!selectedImage && (
        <div
          className="flex flex-col items-center justify-center w-full h-full"
          {...getRootProps()}
        >
          <input {...getInputProps()} />

          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xs"
            >
              <div className="flex items-center justify-center p-4 mb-4 border rounded-full bg-muted">
                <Upload className="size-8 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">Drop images here to upload</p>
                <p className="max-w-xs mt-1 text-xs">
                  PNG, JPG, JPEG, WebP, GIF. 1 file, 50MB max.
                </p>
              </div>
            </motion.div>
          )}

          <div className="flex flex-col items-center justify-center gap-2">
            <span className="max-w-xs text-base text-center text-muted-foreground">
              You can generate a new image or select from gallery to start with.
            </span>
          </div>
        </div>
      )}

      {selectedImage && (
        <div
          ref={imageContainerRef}
          className="relative flex flex-col flex-1 bg-muted/40"
        >
          <Image
            unoptimized
            fill
            src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${selectedImage}`}
            alt="Media content"
            className="object-contain"
            draggable={false}
            ref={imageRef}
            onLoad={updateImageSizes}
          />
          {isMasking && naturalImageSize.width > 0 && (
            <div
              style={{
                position: "absolute",

                top: `${renderedImageRect.top}px`,
                left: `${renderedImageRect.left}px`,
                width: `${renderedImageRect.width}px`,
                height: `${renderedImageRect.height}px`,
                zIndex: 10,
              }}
            >
              <MaskCanvas
                brushSize={64}
                canvasRef={canvasRef}
                canvasSize={naturalImageSize}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
