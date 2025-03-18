"use client";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { AnimatePresence } from "motion/react";
import { Errors } from "./errors";

export const ChatInput = ({
  onSubmit,
}: {
  onSubmit: (message: string) => Promise<void>;
}) => {
  return (
    <AnimatePresence>
      <div className="px-4 py-4 max-w-4xl w-full mx-auto space-y-4">
        <Errors onSubmit={onSubmit} />
        <Textarea
          className="w-full bg-background-subtle focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/10 resize-none"
          placeholder="Type your message here..."
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e.currentTarget.value);
              e.currentTarget.value = "";
            }
          }}
        />
      </div>
    </AnimatePresence>
  );
};
