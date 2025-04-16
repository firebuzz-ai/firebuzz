"use client";

import { useMutation, useUploadFile } from "@firebuzz/convex";
import { api } from "@firebuzz/convex/nextjs";
import { envCloudflarePublic } from "@firebuzz/env";
import { Button } from "@firebuzz/ui/components/ui/button";
import { ImageIcon, Loader2, X } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { getFileType, getMediaContentType } from "@firebuzz/utils";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export const ImageUpload = ({
  value,
  onChange,
  disabled = false,
}: ImageUploadProps) => {
  const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useUploadFile(api.helpers.r2);
  const createMedia = useMutation(
    api.collections.storage.media.mutations.create
  );

  const uploadHandler = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return null;
      }

      try {
        setIsUploading(true);
        // Upload file to R2
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
            source: "uploaded",
          });

          return `${NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;
        }
        return null;
      } catch (error) {
        console.error("Failed to upload image:", error);
        toast.error("Failed to upload image");
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [uploadFile, createMedia, NEXT_PUBLIC_R2_PUBLIC_URL]
  );

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const imageUrl = await uploadHandler(file);
      if (imageUrl) {
        onChange(imageUrl);
        toast.success("Image uploaded successfully");
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    onChange("");
  };

  return (
    <div className="space-y-4">
      {value ? (
        <div className="relative w-full h-40 group">
          <Image
            unoptimized
            src={value}
            alt="Selected content"
            fill
            className="object-contain w-full h-full border rounded-md"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            disabled={disabled || isUploading}
            className="absolute p-1 transition-opacity rounded-full shadow-sm opacity-0 top-2 right-2 bg-background/80 text-foreground hover:bg-background group-hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            disabled={disabled || isUploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="flex flex-col items-center justify-center w-full h-24 gap-2 border-dashed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-5 h-5" />
                <span>Upload Image</span>
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
};
