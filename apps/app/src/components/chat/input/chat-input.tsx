"use client";
import { selectedElementAtom } from "@/lib/workbench/atoms";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { useAtomValue } from "jotai";
import { AnimatePresence } from "motion/react";
import { useCallback } from "react";
import { Errors } from "./errors";
import { SelectedElement } from "./selected-element";

export const ChatInput = ({
  onSubmit,
}: {
  onSubmit: (message: string) => Promise<void>;
}) => {
  const selectedElement = useAtomValue(selectedElementAtom);

  const handleSubmit = useCallback(
    async (message: string) => {
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
    },
    [onSubmit, selectedElement]
  );

  return (
    <AnimatePresence>
      <div className="max-w-4xl w-full mx-auto relative">
        <Errors onSubmit={onSubmit} />
        <SelectedElement />
        <div className="px-4 pb-4">
          <Textarea
            className="w-full bg-background-subtle focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/10 resize-none"
            placeholder="Type your message here..."
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                handleSubmit(e.currentTarget.value);
                e.currentTarget.value = "";
              }
            }}
          />
        </div>
      </div>
    </AnimatePresence>
  );
};
