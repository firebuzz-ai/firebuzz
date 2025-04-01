"use client";
import { useUser } from "@/hooks/auth/use-user";
import {
  attachmentsAtom,
  currentFilesTreeAtom,
  currentImportantFilesAtom,
  isElementSelectionEnabledAtom,
  isPreviewVersionDifferentAtom,
  selectedElementAtom,
  workbenchStore,
} from "@/lib/workbench/atoms";
import { useUploadFile } from "@firebuzz/convex";
import { api, fetchQuery } from "@firebuzz/convex/nextjs";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import {
  ChevronRight,
  ImageIcon,
  Loader2,
  Plus,
} from "@firebuzz/ui/icons/lucide";
import type { ChatRequestOptions, CreateMessage, Message } from "ai";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence } from "motion/react";
import { useParams } from "next/navigation";
import { memo, useCallback, useRef, useState } from "react";
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
    const selectedElement = useAtomValue(selectedElementAtom);
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const { getToken } = useUser();
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

    const uploadHandler = useCallback(
      async (file: File) => {
        try {
          setIsUploading(true);
          const key = await uploadFile(file);
          const token = await getToken({ template: "convex" });
          const url = await fetchQuery(
            api.helpers.r2.getImageUrl,
            { key },
            {
              token: token ?? undefined,
            }
          );
          return url;
        } catch (error) {
          console.error("Failed to upload file:", error);
          return null;
        } finally {
          setIsUploading(false);
        }
      },
      [uploadFile, getToken]
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
              attachments && attachments.length > 0 ? attachments : undefined,
            body: {
              projectId: id,
              currentFileTree,
              currentImportantFiles: Object.entries(currentImportantFiles)
                .map(([key, value]) => `${key}: ${value}`)
                .join("\n"),
              attachments:
                attachments && attachments.length > 0 ? attachments : undefined,
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
          const url = await uploadHandler(file);

          if (url) {
            const newAttachment: ChatAttachment = {
              name: file.name,
              contentType: file.type,
              url,
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
        <div className="max-w-4xl w-full mx-auto relative bg-transparent">
          <Errors onSubmit={onSubmit} />
          <SelectedElement />
          <VersionWarning inputValue={inputValue} shake={showShakeAnimation} />
          <Attachment
            isUploading={isUploading}
            clearAttachments={clearAttachments}
          />

          <div className="px-4 pb-4 relative">
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
            <div className="absolute bottom-6 right-6 text-xs text-muted-foreground flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="size-3 mr-1 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImageIcon className="size-3 mr-1" />
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
