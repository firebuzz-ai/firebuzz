"use client";

import { selectedElementAtom } from "@/lib/workbench/atoms";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Code } from "@firebuzz/ui/icons/lucide";
import { useAtom } from "jotai";
import { motion } from "motion/react";

export const SelectedElement = () => {
  const [selectedElement, setSelectedElement] = useAtom(selectedElementAtom);

  if (!selectedElement) return null;

  const handleRemove = () => {
    setSelectedElement(null);
  };

  return (
    <div className="absolute -top-16 px-4 w-full">
      <motion.div
        className="px-3 py-2 bg-muted border rounded-lg shadow-sm flex w-full items-center justify-between"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 text-primary">
          <Code className="size-4" />
          <p className="text-sm">
            <span className="font-medium">{selectedElement.componentName}</span>
            <span className="text-muted-foreground ml-2">
              {selectedElement.filePath}:{selectedElement.lineNumber}
            </span>
          </p>
        </div>
        <Button
          onClick={handleRemove}
          size="sm"
          variant="outline"
          className="h-8"
        >
          <div className="flex items-center gap-2">
            <div>Clear</div>
            <ButtonShortcut>Esc</ButtonShortcut>
          </div>
        </Button>
      </motion.div>
    </div>
  );
};
