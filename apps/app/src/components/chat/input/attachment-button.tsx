import { useMediaGalleryModal } from "@/hooks/ui/use-media-gallery-modal";
import { useMutation, useUploadFile } from "@firebuzz/convex";
import { api } from "@firebuzz/convex/nextjs";
import { envCloudflarePublic } from "@firebuzz/env";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@firebuzz/ui/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import {
  File,
  GalleryHorizontal,
  Loader2,
  Paperclip,
  Upload,
} from "@firebuzz/ui/icons/lucide";
import { useMediaQuery } from "@uidotdev/usehooks";
import { useCallback, useRef, useState } from "react";

import { attachmentsAtom } from "@/lib/workbench/atoms";
import { isMediaFile, parseMediaFile } from "@firebuzz/utils";
import { useAtom } from "jotai";

// Define an interface for our attachment structure
interface ChatAttachment {
  name: string;
  contentType: string;
  url: string;
  size: number;
}

export const AttachmentButton = ({
  isUploading,
  setIsUploading,
}: {
  isUploading: boolean;
  setIsUploading: (isUploading: boolean) => void;
}) => {
  const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { setState: setGalleryModalState } = useMediaGalleryModal();
  const [isOpen, setIsOpen] = useState(false);
  const [, setAttachments] = useAtom(attachmentsAtom);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useUploadFile(api.helpers.r2);
  const createMedia = useMutation(
    api.collections.storage.media.mutations.create
  );

  const uploadHandler = useCallback(
    async (file: File) => {
      try {
        setIsUploading(true);
        // Upload file to R2
        const key = await uploadFile(file);
        const isMedia = isMediaFile(file);

        // Create media
        if (isMedia) {
          const { type, contentType } = parseMediaFile(file);
          await createMedia({
            key,
            type,
            contentType,
            size: file.size,
            name: file.name,
            source: "uploaded",
          });

          return {
            type: "media",
            contentType,
            url: `${NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`,
          };
        }

        // TODO: Handle Document Upload
      } catch (error) {
        console.error("Failed to upload file:", error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [uploadFile, createMedia, NEXT_PUBLIC_R2_PUBLIC_URL, setIsUploading]
  );

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files);
      setIsOpen(false); // Close dropdown after selecting files

      try {
        setIsUploading(true);

        const uploadPromises = files.map(async (file) => {
          const uploadedFile = await uploadHandler(file);

          if (uploadedFile) {
            return {
              name: file.name,
              contentType: uploadedFile.contentType,
              url: uploadedFile.url,
              size: file.size,
            };
          }
          return null;
        });

        const newAttachments = (await Promise.all(uploadPromises)).filter(
          (attachment): attachment is ChatAttachment => attachment !== null
        );

        if (newAttachments.length > 0) {
          setAttachments((prev) => [...(prev || []), ...newAttachments]);
        }
      } catch (error) {
        console.error("Failed to upload files:", error);
      } finally {
        setIsUploading(false);
      }
    }

    // Reset the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // Mobile (Drawer)
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <Button disabled={isUploading} size="sm" variant="outline">
            {isUploading ? (
              <div className="flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                Uploading...
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Paperclip className=" size-3" />
                Attach
              </div>
            )}
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Attach</DrawerTitle>
            <DrawerDescription>
              Attach a file to your message.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={handleUploadClick}
              disabled={isUploading}
            >
              {isUploading ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" />
                  Uploading...
                </div>
              ) : (
                <>
                  <Upload className="mr-2 size-3" />
                  Upload
                </>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*, video/*, audio/*, application/pdf"
                multiple
                className="hidden"
                disabled={isUploading}
              />
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setGalleryModalState((prev) => ({
                  ...prev,
                  allowMultiple: true,
                  maxFiles: 5,
                  onSelect: (data) => {
                    setAttachments((prev) => [
                      ...(prev || []),
                      ...data.map((item) => ({
                        name: item.fileName,
                        contentType: item.contentType,
                        url: item.url,
                        size: item.size,
                      })),
                    ]);
                  },
                  isOpen: true,
                }));
              }}
            >
              <GalleryHorizontal className="mr-2 size-3" />
              Gallery
            </Button>

            <Button variant="outline">
              <File className="mr-2 size-3" />
              Select from Documents
            </Button>
          </div>
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop Dropdown
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button disabled={isUploading} size="sm" variant="outline">
          {isUploading ? (
            <div className="flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" />
              Uploading...
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Paperclip className="size-3" />
              Attach
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            fileInputRef.current?.click();
          }}
        >
          <Upload className="mr-2 size-3" />
          Upload
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*, video/*, audio/*, application/pdf"
            multiple
            className="hidden"
            disabled={isUploading}
          />
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            setGalleryModalState((prev) => ({
              ...prev,
              allowMultiple: true,
              maxFiles: 5,
              onSelect: (data) => {
                setAttachments((prev) => [
                  ...(prev || []),
                  ...data.map((item) => ({
                    name: item.fileName,
                    contentType: item.contentType,
                    url: item.url,
                    size: item.size,
                  })),
                ]);
              },
              isOpen: true,
            }));
          }}
        >
          <GalleryHorizontal className="mr-2 size-3" />
          Gallery
        </DropdownMenuItem>
        <DropdownMenuItem>
          <File className="mr-2 size-3" />
          Documents
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
