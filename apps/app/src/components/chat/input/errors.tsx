"use client";

import { errorsAtom } from "@/lib/workbench/atoms";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Bug } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useAtom } from "jotai";
import { motion } from "motion/react";
import { useState } from "react";

import { z } from "zod";

export const schema = z.object({
  errorType: z.string().describe("The type of error that is occurring"),
  errorExplanation: z.string().describe("A detailed explanation of the error"),
  hint: z.string().describe("A hint to fix the error"),
});

export const Errors = ({
  onSubmit,
}: {
  onSubmit: (message: string) => Promise<void>;
}) => {
  const [errors, setErrors] = useAtom(errorsAtom);
  const [isHandlingError, setIsHandlingError] = useState(false);

  const getErrorExplanation = async (error: string) => {
    const response = await fetch("/api/chat/landing/fix-error", {
      method: "POST",
      body: JSON.stringify({ prompt: error }),
    });
    const data = await response.json();
    return data;
  };

  const handleErrorClick = async () => {
    try {
      setIsHandlingError(true);
      // Get the error explanations
      const explanations: z.infer<typeof schema>[] = [];
      for (const error of errors) {
        const explanation = await getErrorExplanation(JSON.stringify(error));
        explanations.push(explanation);
      }

      // Clear the errors
      setErrors([]);

      // Submit the explanations as a structured message
      await onSubmit(
        JSON.stringify({
          type: "error-explanation",
          errors: explanations,
        })
      );
      setIsHandlingError(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fix errors");
      setIsHandlingError(false);
    }
  };

  if (errors.length === 0) return null;

  return (
    <div className="absolute -top-16 px-4 w-full">
      <motion.div
        className="px-3 py-2 bg-muted border rounded-lg shadow-sm flex w-full items-center justify-between"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 text-red-400">
          <Bug className="size-4" />
          <p className="text-sm">{errors.length} errors found.</p>
        </div>
        <Button
          onClick={handleErrorClick}
          size="sm"
          className="w-32"
          disabled={isHandlingError}
        >
          {isHandlingError ? (
            <Spinner size="xs" />
          ) : (
            <div className="flex items-center gap-2">
              <div>Fix Errors</div>
              <ButtonShortcut>⌘E</ButtonShortcut>
            </div>
          )}
        </Button>
      </motion.div>
    </div>
  );
};
