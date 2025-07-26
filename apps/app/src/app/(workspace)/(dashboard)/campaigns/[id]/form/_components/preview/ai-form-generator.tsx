"use client";

import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { ArrowRight, Sparkles } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { FormField } from "../form-types";

// Animation variants
const animations = {
  container: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.2, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      y: 20,
      transition: { duration: 0.1, ease: "easeInOut" },
    },
  },
  inputBar: {
    unfocused: {
      scale: 1,
      padding: "0px",
      transition: { type: "spring", stiffness: 400, damping: 25 },
    },
    focused: {
      scale: 1.05,
      padding: "12px",
      transition: { type: "spring", stiffness: 400, damping: 25 },
    },
  },
};

interface AIFormGeneratorProps {
  isVisible: boolean;
  existingSchema: FormField[];
  onSchemaUpdate: (
    schema: FormField[],
    submitButtonText?: string,
    successMessage?: string
  ) => void;
}

export const AIFormGenerator = ({
  isVisible,
  existingSchema,
  onSchemaUpdate,
}: AIFormGeneratorProps) => {
  const [prompt, setPrompt] = useState("");

  const [isFocused, setIsFocused] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleActivate = useCallback(() => {
    setIsFocused(true);
    inputRef.current?.focus();
  }, []);

  const resetGenerator = useCallback(() => {
    setPrompt("");
  }, []);

  useHotkeys("esc", resetGenerator, {
    preventDefault: true,
    enabled: isFocused,
  });

  useHotkeys("meta+g", handleActivate, { preventDefault: true });

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/chat/form/generate-schema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          existingSchema:
            existingSchema.length > 0 ? existingSchema : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate form schema");
      }

      const result = await response.json();

      // Update the form schema
      onSchemaUpdate(
        result.schema,
        result.submitButtonText,
        result.successMessage
      );

      setPrompt("");
    } catch (error) {
      console.error("Error generating form schema:", error);
      // Add proper error handling (consider using a toast notification)
    } finally {
      setIsGenerating(false);
      setIsFocused(false);
    }
  }, [prompt, existingSchema, onSchemaUpdate]);

  // Reset generator when component becomes invisible
  useEffect(() => {
    if (!isVisible) {
      setPrompt("");
      setIsFocused(false);
    }
  }, [isVisible]);

  // Focus input when visible and focused
  useEffect(() => {
    if (isVisible && isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible, isFocused]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        void handleGenerate();
      }
      if (e.key === "Escape") {
        setIsFocused(false);
        inputRef.current?.blur();
      }
    },
    [handleGenerate]
  );

  const handleInputBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsFocused(false);
      }
    },
    []
  );

  if (!isVisible) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        variants={animations.container}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={cn(
          "absolute left-0 right-0 z-10 flex items-center justify-center p-2 pointer-events-none select-none bottom-10",
          isFocused &&
            "inset-0 z-30 bg-background/90  pointer-events-auto flex items-center justify-center"
        )}
      >
        <motion.div
          variants={animations.inputBar}
          animate={isFocused ? "focused" : "unfocused"}
          layoutId="aiGeneratorBar"
          className="flex relative items-center w-full max-w-xl rounded-md border shadow-sm pointer-events-auto bg-background border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pr-2 pl-3 text-muted-foreground">
            <Sparkles className="size-4" />
          </div>

          <Input
            ref={inputRef}
            type="text"
            placeholder={
              existingSchema.length > 0
                ? "Ask AI to modify your form..."
                : "Describe the form you want to create..."
            }
            className="flex-1 h-9 text-sm bg-transparent border-none outline-none focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => !isFocused && setIsFocused(true)}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
          />

          <div className="flex gap-1 items-center">
            <Button
              className="hover:bg-transparent"
              variant="ghost"
              size="iconSm"
            >
              <ButtonShortcut>⌘G</ButtonShortcut>
            </Button>
            <Button
              variant="ghost"
              size="iconSm"
              className="p-2 mr-1 w-auto h-auto rounded-md text-muted-foreground hover:bg-muted disabled:bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                void handleGenerate();
              }}
              disabled={!prompt.trim() || isGenerating}
            >
              {isGenerating ? (
                <Spinner size="xs" />
              ) : (
                <ArrowRight className="size-4" />
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
