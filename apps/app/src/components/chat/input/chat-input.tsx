"use client";
import { useTwoPanelsLayout } from "@/hooks/ui/use-two-panels-layout";
import {
  currentFilesTreeAtom,
  currentImportantFilesAtom,
  isElementSelectionEnabledAtom,
  isPreviewVersionDifferentAtom,
  selectedElementAtom,
} from "@/lib/workbench/atoms";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { ChevronRight, Plus } from "@firebuzz/ui/icons/lucide";
import type { ChatRequestOptions, CreateMessage, Message } from "ai";
import { useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence } from "motion/react";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Errors } from "./errors";
import { SelectedElement } from "./selected-element";
import { VersionWarning } from "./version-warning";

export const ChatInput = ({
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
  const [inputValue, setInputValue] = useState("");
  const [showShakeAnimation, setShowShakeAnimation] = useState(false);

  const isPreviewVersionDifferent = useAtomValue(isPreviewVersionDifferentAtom);

  const currentFileTree = useAtomValue(currentFilesTreeAtom);
  const currentImportantFiles = useAtomValue(currentImportantFilesAtom);
  const setIsElementSelectionEnabled = useSetAtom(
    isElementSelectionEnabledAtom
  );
  const setSelectedElement = useSetAtom(selectedElementAtom);

  const { closeRightPanel } = useTwoPanelsLayout();

  const onSubmit = useCallback(
    async (message: string) => {
      closeRightPanel();
      setIsElementSelectionEnabled(false);
      setSelectedElement(null);

      // Let the useChat hook handle messages state management
      await append(
        {
          role: "user",
          content: message,
        },
        {
          body: {
            projectId: id,
            currentFileTree,
            currentImportantFiles: Object.entries(currentImportantFiles)
              .map(([key, value]) => `${key}: ${value}`)
              .join("\n"),
          },
        }
      ).finally(() => {
        // Update the isSending state in ChatInput after append completes
        const chatInput = document.querySelector("textarea");
        if (chatInput) {
          (chatInput as HTMLTextAreaElement).disabled = false;
        }
      });
    },
    [
      append,
      id,
      closeRightPanel,
      currentFileTree,
      currentImportantFiles,
      setIsElementSelectionEnabled,
      setSelectedElement,
    ]
  );

  const handleSubmit = useCallback(
    async (message: string) => {
      if (!message.trim() || isSending) return;

      // Don't allow sending if there's a version mismatch
      if (isPreviewVersionDifferent && message.trim()) {
        setShowShakeAnimation(true);
        // Reset shake animation after a delay
        setTimeout(() => setShowShakeAnimation(false), 600);
        return;
      }

      setIsSending(true);
      setInputValue("");

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
        setInputValue(message);
      } finally {
        setIsSending(false);
      }
    },
    [onSubmit, selectedElement, isSending, isPreviewVersionDifferent]
  );

  return (
    <AnimatePresence>
      <div className="max-w-4xl w-full mx-auto relative bg-transparent">
        <Errors onSubmit={onSubmit} />
        <SelectedElement />
        <VersionWarning inputValue={inputValue} shake={showShakeAnimation} />
        <div className="px-4 pb-4 relative">
          <Textarea
            className="w-full bg-background-subtle bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/10 resize-none pb-16 max-h-[200px] overflow-y-auto"
            placeholder={isSending ? "Sending..." : "Type your message here..."}
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
            disabled={isSending}
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
          {/* Send button */}
          <div className="absolute bottom-6 right-6 text-xs text-muted-foreground flex gap-2">
            <Button
              disabled={isSending}
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
};
