"use client";
import { CheckCheck, Clipboard } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { Input } from "../ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
export const ReadonlyInputWithClipboard = ({
  value,
  className,
}: {
  value: string;
  className?: string;
}) => {
  const [state, setState] = useState<"idle" | "copied">("idle");

  const handleCopy = () => {
    setState("idle");
    navigator.clipboard.writeText(value);
    setState("copied");
    return setTimeout(() => {
      setState("idle");
    }, 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-full">
        <Input
          readOnly
          value={value}
          className={cn("pr-10", className)}
          onClick={(e) => e.currentTarget.select()}
        />
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={handleCopy}
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-2.5  bg-accent/50 border-l border-l-border rounded-r-md"
              >
                <AnimatePresence mode="wait">
                  {state === "copied" && (
                    <motion.div
                      key="copied"
                      className="flex items-center justify-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <CheckCheck className="w-3 h-3 text-brand" />
                    </motion.div>
                  )}
                  {state === "idle" && (
                    <motion.div
                      key="idle"
                      className="flex items-center justify-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Clipboard className="w-3 h-3" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              <p>Copy to clipboard</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};
