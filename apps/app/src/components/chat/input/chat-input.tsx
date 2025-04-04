"use client";
import {
  attachmentsAtom,
  currentFilesTreeAtom,
  currentImportantFilesAtom,
  isElementSelectionEnabledAtom,
  isPreviewVersionDifferentAtom,
  selectedElementAtom,
  workbenchStore,
} from "@/lib/workbench/atoms";
import { useMutation, useUploadFile } from "@firebuzz/convex";
import { api } from "@firebuzz/convex/nextjs";
import { envCloudflarePublic } from "@firebuzz/env";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import {
  ChevronRight,
  ImageIcon,
  Loader2,
  Plus,
} from "@firebuzz/ui/icons/lucide";
import { getFileType, getMediaContentType } from "@firebuzz/utils";
import type { ChatRequestOptions, CreateMessage, Message } from "ai";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence } from "motion/react";
import { useParams } from "next/navigation";
import { memo, useCallback, useRef, useState } from "react";
import { ActionErrors } from "./action-errors";
import { Attachment } from "./attachment";
import { Errors } from "./errors";
import { SelectedElement } from "./selected-element";
import { VersionWarning } from "./version-warning";

// Define an interface for our attachment structure
interface ChatAttachment {
  name: string;
  contentType: string;
  url: string;
  size: number;
}

const getCurrentFileTree = () => {
  const currentFileTree = workbenchStore.get(currentFilesTreeAtom);
  const currentImportantFiles = workbenchStore.get(currentImportantFilesAtom);

  return {
    currentFileTree,
    currentImportantFiles,
  };
};

export const ChatInput = memo(
  ({
    append,
  }: {
    append: (
      message: Message | CreateMessage,
      chatRequestOptions?: ChatRequestOptions
    ) => Promise<string | null | undefined>;
  }) => {
    const { id } = useParams();
    const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
    const selectedElement = useAtomValue(selectedElementAtom);
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [showShakeAnimation, setShowShakeAnimation] = useState(false);
    const [attachments, setAttachments] = useAtom(attachmentsAtom);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isPreviewVersionDifferent = useAtomValue(
      isPreviewVersionDifferentAtom
    );

    const setIsElementSelectionEnabled = useSetAtom(
      isElementSelectionEnabledAtom
    );
    const setSelectedElement = useSetAtom(selectedElementAtom);

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
          const { type, extension } = getFileType(file);

          // Create media
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

            return {
              type: "media",
              mediaType,
              url: `${NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`,
            };
          }

          return {
            type: "document",
            documentType: extension,
            url: `${NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`,
          };
        } catch (error) {
          console.error("Failed to upload file:", error);
          return null;
        } finally {
          setIsUploading(false);
        }
      },
      [uploadFile, createMedia, NEXT_PUBLIC_R2_PUBLIC_URL]
    );

    const onSubmit = useCallback(
      async (message: string) => {
        const { currentFileTree, currentImportantFiles } = getCurrentFileTree();

        // Let the useChat hook handle messages state management
        await append(
          {
            role: "user",
            content: message,
          },
          {
            experimental_attachments:
              attachments && attachments.length > 0
                ? attachments.map((attachment) => ({
                    name: attachment.name,
                    url: attachment.url,
                    contentType: attachment.contentType,
                  }))
                : undefined,
            body: {
              projectId: id,
              currentFileTree,
              currentImportantFiles: Object.entries(currentImportantFiles)
                .map(([key, value]) => `${key}: ${value}`)
                .join("\n"),
              attachments:
                attachments && attachments.length > 0
                  ? attachments.map((attachment) => ({
                      name: attachment.name,
                      url: attachment.url,
                      contentType: attachment.contentType,
                    }))
                  : undefined,
            },
          }
        );
      },
      [append, id, attachments]
    );

    const clearAttachments = useCallback(() => {
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }, [setAttachments]);

    const clearStates = useCallback(() => {
      setInputValue("");
      clearAttachments();
      setSelectedElement(null);
      setIsElementSelectionEnabled(false);
    }, [setSelectedElement, setIsElementSelectionEnabled, clearAttachments]);

    const handleSubmit = useCallback(
      async (message: string) => {
        if (
          (!message.trim() && attachments && attachments.length === 0) ||
          isSending ||
          isUploading
        )
          return;

        // Don't allow sending if there's a version mismatch
        if (
          isPreviewVersionDifferent &&
          (message.trim() || (attachments && attachments.length > 0))
        ) {
          setShowShakeAnimation(true);
          // Reset shake animation after a delay
          setTimeout(() => setShowShakeAnimation(false), 600);
          return;
        }

        setIsSending(true);
        clearStates();

        try {
          if (selectedElement) {
            // If there's a selected element, attach it to the message
            const messageWithElement = JSON.stringify({
              type: "element-reference",
              message,
              element: selectedElement,
            });
            await onSubmit(messageWithElement);
          } else {
            // Otherwise just send the regular message
            await onSubmit(message);
          }
        } catch (error) {
          console.error("Failed to send message:", error);
        } finally {
          setIsSending(false);
        }
      },
      [
        onSubmit,
        selectedElement,
        isSending,
        isPreviewVersionDifferent,
        attachments,
        isUploading,
        clearStates,
      ]
    );

    const handleFileChange = async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];

        try {
          setIsUploading(true);
          const uploadedFile = await uploadHandler(file);

          if (uploadedFile) {
            const newAttachment: ChatAttachment = {
              name: file.name,
              contentType: file.type,
              url: uploadedFile.url,
              size: file.size,
            };

            setAttachments([newAttachment]);
          }
        } catch (error) {
          console.error("Failed to upload file:", error);
        }
      }
    };

    return (
      <AnimatePresence>
        <div className="relative w-full max-w-4xl mx-auto bg-transparent">
          <Errors onSubmit={onSubmit} />
          <ActionErrors onSubmit={onSubmit} />
          <SelectedElement />
          <VersionWarning inputValue={inputValue} shake={showShakeAnimation} />
          <Attachment
            isUploading={isUploading}
            clearAttachments={clearAttachments}
          />

          <div className="relative px-4 pb-4">
            <Textarea
              className="w-full bg-background-subtle bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/10 resize-none pb-16 max-h-[200px] overflow-y-auto"
              placeholder={
                isSending
                  ? "Sending..."
                  : isUploading
                    ? "Uploading image..."
                    : "Type your message here..."
              }
              rows={2}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                // Auto-resize textarea up to max-height
                e.target.style.height = "auto";
                const newHeight = Math.min(e.target.scrollHeight, 200);
                e.target.style.height = `${newHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(inputValue);
                }
              }}
              disabled={isSending || isUploading}
            />

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              disabled={isUploading || isSending}
            />

            {/* New line button */}
            <div className="flex items-center gap-0.5 absolute bottom-6 left-6 text-xs text-muted-foreground">
              <span className="font-medium bg-muted border shadow-sm rounded-md py-0.5 px-1.5">
                Shift
              </span>{" "}
              <Plus className="size-3" />
              <span className="font-medium bg-muted border shadow-sm rounded-md py-0.5 px-1.5">
                Enter
              </span>
              <ChevronRight className="size-3" />
              <span>New Line</span>
            </div>

            {/* Send and Upload buttons */}
            <div className="absolute flex gap-2 text-xs bottom-6 right-6 text-muted-foreground">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-1 size-3 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-1 size-3" />
                    Image
                  </>
                )}
              </Button>
              <Button
                disabled={isSending || isUploading}
                onClick={() => handleSubmit(inputValue)}
                size="sm"
                variant="outline"
              >
                Send <ButtonShortcut>Enter</ButtonShortcut>
              </Button>
            </div>
          </div>
        </div>
      </AnimatePresence>
    );
  }
);
