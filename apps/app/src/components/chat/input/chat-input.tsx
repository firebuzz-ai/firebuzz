"use client";
import { selectedElementAtom } from "@/lib/workbench/atoms";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { useAtomValue } from "jotai";
import { AnimatePresence } from "motion/react";
import { useCallback, useState } from "react";
import { Errors } from "./errors";
import { SelectedElement } from "./selected-element";

export const ChatInput = ({
  onSubmit,
}: {
  onSubmit: (message: string) => Promise<void>;
}) => {
  const selectedElement = useAtomValue(selectedElementAtom);
  const [isSending, setIsSending] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = useCallback(
    async (message: string) => {
      if (!message.trim() || isSending) return;

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
    [onSubmit, selectedElement, isSending]
  );

  return (
    <AnimatePresence>
      <div className="max-w-4xl w-full mx-auto relative bg-transparent">
        <Errors onSubmit={onSubmit} />
        <SelectedElement />
        <div className="px-4 pb-4">
          <Textarea
            className="w-full bg-background-subtle focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/10 resize-none"
            placeholder={isSending ? "Sending..." : "Type your message here..."}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                handleSubmit(inputValue);
              }
            }}
          />
        </div>
      </div>
    </AnimatePresence>
  );
};
