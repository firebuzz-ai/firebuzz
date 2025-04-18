"use client";

import { errorsAtom } from "@/lib/workbench/atoms";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Bug } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useAtom } from "jotai";
import { motion } from "motion/react";
import { useEffect } from "react";

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

  const {
    object,
    submit,
    isLoading: isHandlingError,
  } = useObject({
    api: "/api/chat/landing/fix-error",
    schema: z.array(schema),
  });

  const handleErrorClick = async () => {
    try {
      // Get the error explanations
      submit({
        prompt: JSON.stringify(errors, null, 2),
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to fix errors");
    }
  };

  const handleMarkAsResolved = () => {
    setErrors([]);
  };

  useEffect(() => {
    if (object) {
      setErrors([]);
      onSubmit(
        JSON.stringify({
          type: "error-explanation",
          errors: object,
        })
      );
    }
  }, [object, onSubmit, setErrors]);

  if (errors.length === 0) return null;

  return (
    <div className="absolute w-full px-4 -top-16">
      <motion.div
        className="flex items-center justify-between w-full px-3 py-2 border rounded-lg shadow-sm bg-muted"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 text-red-400">
          <Bug className="size-4" />
          <p className="text-sm">{errors.length} errors found.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleMarkAsResolved} size="sm" variant="ghost">
            Mark as resolved
          </Button>
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
        </div>
      </motion.div>
    </div>
  );
};
