"use client";

import { MediaGalleryModal } from "@/components/modals/media/gallery-modal";
import { useMediaGalleryModal } from "@/hooks/ui/use-media-gallery-modal";
import { api, useMutation, useUploadFile } from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import { UploadProgressToast } from "@firebuzz/ui/components/reusable/upload-progress-toast";
import { Button } from "@firebuzz/ui/components/ui/button";
import { GalleryHorizontal, Upload } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { sleep } from "@firebuzz/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";

export const ImageSelect = ({
  onChange,
  allowedTypes = ["image/*"],
}: {
  onChange: (url: string) => void;
  allowedTypes?: string[];
}) => {
  const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
  const { setIsOpen, setOnSelect, setAllowedTypes } = useMediaGalleryModal();
  const [isDragActive, setIsDragActive] = useState(false);

  const uploadFile = useUploadFile(api.helpers.r2);
  const createMedia = useMutation(
    api.collections.storage.media.mutations.create
  );

  // Max file size: 50MB
  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  const onDrop = async (acceptedFiles: File[]) => {
    try {
      // Only use the first file since we're selecting a single image
      const file = acceptedFiles[0];

      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File ${file.name} exceeds 50MB size limit`);
      }

      // Create a unique toast ID for this upload
      const toastId = `upload-${file.name}-${Date.now()}`;

      // Show initial toast
      toast.loading(
        <UploadProgressToast
          fileName={file.name}
          progress={0}
          uploadedSize={0}
          totalSize={file.size}
          timeLeft="Calculating..."
        />,
        { id: toastId }
      );

      // Simulate upload progress
      const startTime = Date.now();
      const uploadDuration = Math.max(2000, file.size / 256);
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(90, (elapsed / uploadDuration) * 100);
        const uploadedSize = Math.round((file.size * progress) / 100);
        const remainingSize = file.size - uploadedSize;
        const uploadSpeed = uploadedSize / elapsed; // bytes per ms
        const timeLeftMs = remainingSize / uploadSpeed;
        const timeLeftSec = Math.ceil(timeLeftMs / 1000);

        toast.loading(
          <UploadProgressToast
            fileName={file.name}
            progress={Math.round(progress)}
            uploadedSize={uploadedSize}
            totalSize={file.size}
            timeLeft={`${Math.max(0, timeLeftSec)} seconds left`}
          />,
          { id: toastId }
        );
      }, 100);

      const key = await uploadFile(file);

      await createMedia({
        key,
        name: file.name,
        type: file.type.split("/")[0] as "image" | "video" | "audio",
        contentType: file.type,
        size: file.size,
        source: "uploaded",
      });

      clearInterval(interval);

      // Show success state
      toast.success(
        <UploadProgressToast
          fileName={file.name}
          progress={100}
          uploadedSize={file.size}
          totalSize={file.size}
        />,
        { id: toastId }
      );

      await sleep(1000);
      toast.dismiss(toastId);

      // Update the parent component with the new image URL
      onChange(`${NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  };

  const handleFileRejection = (fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      for (const rejection of fileRejections) {
        const message = rejection.errors[0].message;
        if (message.includes("File is larger than")) {
          toast.error("File exceeds 50MB size limit.");
        } else if (message.includes("Type not allowed")) {
          toast.error("File type not allowed.");
        } else {
          toast.error(rejection.errors[0].message);
        }
      }
    }
  };

  const getAcceptFormat = () => {
    const result: Record<string, string[]> = {};
    for (const type of allowedTypes) {
      result[type] = [];
    }
    return result;
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    onDropRejected: handleFileRejection,
    accept: getAcceptFormat(),
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    noClick: true,
    multiple: false,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
  });

  const handleGalleryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAllowedTypes(["image"]);
    setOnSelect((data) => {
      onChange(data[0].url);
    });
    setIsOpen(true);
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    open();
  };

  return (
    <div
      className="relative flex items-center justify-center h-40 gap-4 p-4 border rounded-md"
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
            className="absolute inset-0 z-50 flex flex-col items-center justify-center text-white rounded-md bg-background/95 backdrop-blur-xs"
          >
            <div className="flex items-center justify-center p-4 mb-4 border rounded-full bg-muted">
              <Upload className="size-5 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="font-bold">Drop image here to upload</p>
              <p className="max-w-xs mt-1 text-xs">
                Drop your image here to upload it automatically.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buttons */}
      <MediaGalleryModal asChild>
        <Button size="sm" variant="outline" onClick={handleGalleryClick}>
          <GalleryHorizontal className="size-3" /> Gallery
        </Button>
      </MediaGalleryModal>

      <Button size="sm" variant="outline" onClick={handleUploadClick}>
        <Upload className="size-3" /> Upload
      </Button>
    </div>
  );
};
